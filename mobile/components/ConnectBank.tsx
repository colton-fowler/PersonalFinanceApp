import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  create,
  destroy,
  dismissLink,
  LinkExit,
  LinkExitMetadataStatus,
  LinkIOSPresentationStyle,
  LinkLogLevel,
  LinkSuccess,
  open,
  usePlaidEmitter,
} from "react-native-plaid-link-sdk";
import { SETTING_KEYS } from "../db/models/setting";
import { setSetting } from "../db/repositories/settingsRepository";
import {
  createLinkToken,
  exchangeToken,
  getApiBaseUrl,
  PlaidApiError,
  setApiBaseUrl,
  setApiSharedSecret,
} from "../services/plaidApi";
import { savePlaidAccessToken } from "../services/plaidTokenStore";
import { hasSecret, SECRET_KEYS } from "../security/secureStore";
import { safeLogger } from "../security/safeLogger";

type FlowState = "idle" | "loading" | "connected" | "success" | "error";

type LinkExitWithPublicToken = LinkExit & { publicToken?: string };

const LOCAL_USER_ID = "rmoney-local-user";
const GENERIC_ERROR = "Connection failed. Please try again.";
const GENERIC_SUCCESS = "Bank connected successfully.";

async function closePlaidLink(): Promise<void> {
  dismissLink();
  await destroy();
}

function logLinkSuccessMetadata(success: LinkSuccess): void {
  safeLogger.info("Plaid onSuccess", {
    credentialPresent: success.publicToken.length > 0,
    linkSessionId: success.metadata.linkSessionId,
    accountCount: success.metadata.accounts.length,
    hasInstitution: Boolean(success.metadata.institution),
  });
}

function publicTokenFromConnectedExit(exit: LinkExitWithPublicToken): string | null {
  if (exit.publicToken && exit.publicToken.length > 0) {
    return exit.publicToken;
  }

  const metadataJson = exit.metadata.metadataJson;
  if (!metadataJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadataJson) as { public_token?: string };
    if (typeof parsed.public_token === "string" && parsed.public_token.length > 0) {
      return parsed.public_token;
    }
  } catch {
    return null;
  }

  return null;
}

type ConnectBankProps = {
  onConnected?: () => void;
};

/**
 * Minimal Plaid Link test — exchanges public_token via proxy, stores access_token in Secure Store.
 * Never log tokens, institution metadata, or Link success payloads.
 */
export function ConnectBank({ onConnected }: ConnectBankProps) {
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const exchangeInFlight = useRef(false);
  const linkSessionComplete = useRef(false);

  const refreshConnectionState = useCallback(async () => {
    const linked = await hasSecret(SECRET_KEYS.PLAID_ACCESS_TOKEN);
    setFlowState(linked ? "connected" : "idle");
  }, []);

  usePlaidEmitter((event) => {
    safeLogger.info("Plaid onEvent", {
      eventName: event.eventName,
      viewName: event.metadata.viewName,
      linkSessionId: event.metadata.linkSessionId,
      exitStatus: event.metadata.exitStatus,
    });
  });

  useEffect(() => {
    void refreshConnectionState();
  }, [refreshConnectionState]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    void (async () => {
      if (process.env.EXPO_PUBLIC_API_BASE_URL) {
        await setApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
      } else {
        await setApiBaseUrl(await getApiBaseUrl());
      }
      if (process.env.EXPO_PUBLIC_API_SHARED_SECRET) {
        const configured = await hasSecret(SECRET_KEYS.API_SHARED_SECRET);
        if (!configured) {
          await setApiSharedSecret(process.env.EXPO_PUBLIC_API_SHARED_SECRET);
        }
      }
    })();
  }, []);

  const completeLinkExchange = useCallback(
    async (publicToken: string, source: "onSuccess" | "onExit") => {
      if (exchangeInFlight.current || linkSessionComplete.current) {
        safeLogger.info("Plaid exchange skipped", { source, reason: "already-handled" });
        return;
      }

      if (!publicToken) {
        safeLogger.error("Plaid exchange skipped", { source, reason: "missing-public-token" });
        setFlowState("error");
        await closePlaidLink();
        return;
      }

      exchangeInFlight.current = true;
      safeLogger.info("Plaid exchange starting", {
        source,
        credentialPresent: true,
      });

      try {
        const { access_token, item_id } = await exchangeToken(publicToken);
        await savePlaidAccessToken(access_token);
        await setSetting(SETTING_KEYS.PLAID_ITEM_ID, item_id);
        linkSessionComplete.current = true;
        safeLogger.info("Plaid Link exchange completed", { source });
        await closePlaidLink();
        setFlowState("connected");
        onConnected?.();
      } catch (error) {
        const status = error instanceof PlaidApiError ? error.status : undefined;
        safeLogger.error("Plaid token exchange failed", { source, status });
        await closePlaidLink();
        setFlowState("error");
      } finally {
        exchangeInFlight.current = false;
      }
    },
    [onConnected],
  );

  const handleConnect = async () => {
    exchangeInFlight.current = false;
    linkSessionComplete.current = false;
    setFlowState("loading");
    safeLogger.info("Plaid Link flow started");

    try {
      const { link_token } = await createLinkToken(LOCAL_USER_ID);

      create({ token: link_token, noLoadingState: false });

      open({
        onSuccess: (success) => {
          logLinkSuccessMetadata(success);
          void completeLinkExchange(success.publicToken, "onSuccess");
        },
        onExit: (exit) => {
          safeLogger.info("Plaid onExit", {
            status: exit.metadata.status,
            hasError: Boolean(exit.error),
            linkSessionId: exit.metadata.linkSessionId,
          });

          if (linkSessionComplete.current || exchangeInFlight.current) {
            return;
          }

          if (exit.metadata.status === LinkExitMetadataStatus.CONNECTED) {
            const publicToken = publicTokenFromConnectedExit(exit);
            safeLogger.info("Plaid onExit connected", {
              credentialPresent: Boolean(publicToken),
            });
            if (publicToken) {
              void completeLinkExchange(publicToken, "onExit");
              return;
            }
          }

          void (async () => {
            await closePlaidLink();
            await refreshConnectionState();
          })();
        },
        iOSPresentationStyle: LinkIOSPresentationStyle.MODAL,
        logLevel: LinkLogLevel.ERROR,
      });
    } catch (error) {
      if (error instanceof PlaidApiError) {
        if (error.message === "Plaid proxy is not configured.") {
          safeLogger.error("Plaid proxy configuration error");
        } else {
          safeLogger.error("Plaid Link token request failed", {
            status: error.status,
          });
        }
      } else {
        safeLogger.error("Plaid Link flow failed");
      }
      setFlowState("error");
    }
  };

  const isBusy = flowState === "loading";

  return (
    <View className="mt-8 w-full max-w-sm gap-3">
      {flowState === "connected" ? (
        <Text className="text-center text-green-700">
          A bank is already connected on this device.
        </Text>
      ) : null}

      {flowState === "success" ? (
        <Text className="text-center text-green-700">{GENERIC_SUCCESS}</Text>
      ) : null}

      {flowState === "error" ? (
        <Text className="text-center text-red-600">{GENERIC_ERROR}</Text>
      ) : null}

      <Pressable
        onPress={() => void handleConnect()}
        disabled={isBusy || flowState === "connected"}
        className={`rounded-xl bg-brand-600 py-3 px-4 items-center ${
          isBusy || flowState === "connected" ? "opacity-50" : "active:bg-brand-700"
        }`}
      >
        {isBusy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-semibold text-white">
            {flowState === "connected" ? "Connected" : "Connect bank (sandbox)"}
          </Text>
        )}
      </Pressable>

      <Text className="text-center text-xs text-slate-500">
        Requires dev build, proxy server, and Plaid sandbox credentials.
      </Text>
    </View>
  );
}
