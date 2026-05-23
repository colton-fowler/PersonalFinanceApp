import "./global.css";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ConnectBank } from "./components/ConnectBank";
import { initializeDatabase } from "./db";
import { Dashboard } from "./screens/Dashboard";
import { hasSecret, SECRET_KEYS } from "./security/secureStore";
import { safeLogger } from "./security/safeLogger";

type InitState = "loading" | "ready" | "error";

const GENERIC_INIT_ERROR =
  "Unable to start the app. Please close and reopen RMoney.";

function MainShell({
  linked,
  onLinked,
}: {
  linked: boolean;
  onLinked: () => void;
}) {
  if (linked) {
    return <Dashboard />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-center text-lg font-semibold text-slate-900">
        RMoney
      </Text>
      <Text className="mt-2 text-center text-slate-600">
        Connect your bank to see balances on your dashboard.
      </Text>
      <ConnectBank onConnected={onLinked} />
    </View>
  );
}

/**
 * App entry — initializes local SQLite once before any financial reads.
 */
export default function App() {
  const [initState, setInitState] = useState<InitState>("loading");
  const [linked, setLinked] = useState<boolean | null>(null);
  const initStarted = useRef(false);

  const refreshLinkedState = useCallback(async () => {
    const isLinked = await hasSecret(SECRET_KEYS.PLAID_ACCESS_TOKEN);
    setLinked(isLinked);
  }, []);

  useEffect(() => {
    if (initStarted.current) {
      return;
    }
    initStarted.current = true;

    let cancelled = false;

    (async () => {
      try {
        await initializeDatabase();
        if (!cancelled) {
          setInitState("ready");
          await refreshLinkedState();
        }
      } catch {
        safeLogger.error("Database initialization failed");
        if (!cancelled) {
          setInitState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshLinkedState]);

  if (initState === "loading" || (initState === "ready" && linked === null)) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <ActivityIndicator size="large" color="#0284c7" />
        <Text className="mt-4 text-center text-slate-600">Starting RMoney…</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (initState === "error") {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-lg font-semibold text-slate-900">
          Something went wrong
        </Text>
        <Text className="mt-2 text-center text-slate-600">{GENERIC_INIT_ERROR}</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <MainShell linked={linked === true} onLinked={() => setLinked(true)} />
      <StatusBar style="auto" />
    </View>
  );
}
