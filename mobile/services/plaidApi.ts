import { Platform } from "react-native";
import { SETTING_KEYS } from "../db/models/setting";
import { getSetting, setSetting } from "../db/repositories/settingsRepository";
import { getSecret, saveSecret, SECRET_KEYS } from "../security/secureStore";
import { safeLogger } from "../security/safeLogger";

/**
 * Client for the private Plaid proxy (server/).
 * PLAID_SECRET stays on the server; this module only sends API_SHARED_SECRET + user tokens.
 *
 * Never log: Plaid tokens, account IDs, transaction names, balances, or response bodies.
 */

function devLoopbackHost(): string {
  return Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
}

function defaultApiBaseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${devLoopbackHost()}:3001`
  );
}

/** Android emulator cannot reach host 127.0.0.1; rewrite persisted localhost URLs. */
export function normalizeApiBaseUrlForPlatform(url: string): string {
  if (Platform.OS !== "android") {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
      parsed.hostname = "10.0.2.2";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    return url;
  }

  return url;
}

function apiBaseUrlHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

export type PlaidApiConfig = {
  apiBaseUrl: string;
  apiSharedSecret: string;
};

export type LinkTokenRequest = {
  clientUserId: string;
};

export type LinkTokenResponse = {
  link_token: string;
  expiration: string;
};

export type ExchangeTokenRequest = {
  publicToken: string;
};

export type ExchangeTokenResponse = {
  access_token: string;
  item_id: string;
};

export type TransactionsSyncRequest = {
  accessToken: string;
};

export type NormalizedTransaction = {
  plaid_transaction_id: string;
  plaid_account_id: string;
  name: string;
  merchant_name: string | null;
  amount: number;
  date: string;
  category: string;
  pending: boolean;
  iso_currency_code: string | null;
};

export type TransactionsSyncResponse = {
  transactions: NormalizedTransaction[];
  start_date: string;
  end_date: string;
  last_updated: string;
};

export type AccountsBalancesRequest = {
  accessToken: string;
};

export type PlaidAccountBalance = {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  current_balance: number | null;
  available_balance: number | null;
};

export type AccountsBalancesResponse = {
  institution_name: string;
  accounts: PlaidAccountBalance[];
  last_updated: string;
};

export class PlaidApiError extends Error {
  readonly status?: number;

  constructor(
    message = "Unable to complete the request. Please try again.",
    status?: number,
  ) {
    super(message);
    this.name = "PlaidApiError";
    this.status = status;
  }
}

/** Non-secret proxy URL (SQLite settings, then Expo public env, then localhost default). */
export async function getApiBaseUrl(): Promise<string> {
  const row = await getSetting(SETTING_KEYS.API_BASE_URL);
  const raw = row?.value ?? defaultApiBaseUrl();
  return normalizeApiBaseUrlForPlatform(raw);
}

export async function setApiBaseUrl(url: string): Promise<void> {
  await setSetting(SETTING_KEYS.API_BASE_URL, url);
  safeLogger.info("API base URL setting updated");
}

/** Shared secret for Authorization header — Secure Store only, never hardcoded. */
export async function setApiSharedSecret(secret: string): Promise<void> {
  await saveSecret(SECRET_KEYS.API_SHARED_SECRET, secret);
}

export async function loadPlaidApiConfig(): Promise<PlaidApiConfig> {
  const apiBaseUrl = await getApiBaseUrl();
  const apiSharedSecret = await getSecret(SECRET_KEYS.API_SHARED_SECRET);

  if (!apiSharedSecret) {
    throw new PlaidApiError("Plaid proxy is not configured.");
  }

  return { apiBaseUrl, apiSharedSecret };
}

async function postJson<TResponse>(
  path: string,
  body: Record<string, unknown>,
  config?: PlaidApiConfig,
): Promise<TResponse> {
  const { apiBaseUrl, apiSharedSecret } = config ?? (await loadPlaidApiConfig());
  const requestHost = apiBaseUrlHost(apiBaseUrl);

  safeLogger.debug("Plaid proxy request", { path, host: requestHost });

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiSharedSecret}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      safeLogger.error("Plaid proxy error", {
        path,
        host: requestHost,
        status: response.status,
      });
      throw new PlaidApiError(undefined, response.status);
    }

    return (await response.json()) as TResponse;
  } catch (error) {
    if (error instanceof PlaidApiError) {
      throw error;
    }
    safeLogger.error("Plaid proxy request failed", { path, host: requestHost });
    throw new PlaidApiError();
  }
}

export async function createLinkToken(
  clientUserId: string,
  config?: PlaidApiConfig,
): Promise<LinkTokenResponse> {
  const body: LinkTokenRequest = { clientUserId };
  return postJson<LinkTokenResponse>("/plaid/link-token", body, config);
}

export async function exchangeToken(
  publicToken: string,
  config?: PlaidApiConfig,
): Promise<ExchangeTokenResponse> {
  safeLogger.info("Plaid exchange-token request", {
    credentialPresent: publicToken.length > 0,
  });
  const body: ExchangeTokenRequest = { publicToken };
  const result = await postJson<ExchangeTokenResponse>(
    "/plaid/exchange-token",
    body,
    config,
  );
  safeLogger.info("Plaid exchange-token response", {
    hasItemId: Boolean(result.item_id),
    exchangeOk: Boolean(result.access_token),
  });
  return result;
}

export async function fetchTransactionsSync(
  request: TransactionsSyncRequest,
  config?: PlaidApiConfig,
): Promise<TransactionsSyncResponse> {
  return postJson<TransactionsSyncResponse>("/plaid/transactions", request, config);
}

export async function fetchAccountsBalances(
  request: AccountsBalancesRequest,
  config?: PlaidApiConfig,
): Promise<AccountsBalancesResponse> {
  return postJson<AccountsBalancesResponse>(
    "/plaid/accounts-balances",
    request,
    config,
  );
}
