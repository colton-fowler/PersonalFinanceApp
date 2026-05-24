import { clearCrashLogs, listCrashLogs } from "./crashLogStore";

type CrashLogDevTools = {
  list: () => Promise<unknown>;
  export: () => Promise<string>;
  clear: () => Promise<void>;
};

/** Registers __RMONEY_CRASH_LOGS__ on globalThis — dev builds only. */
export function registerDevCrashTools(): void {
  if (!__DEV__) {
    return;
  }

  const tools: CrashLogDevTools = {
    list: async () => listCrashLogs(),
    export: async () => {
      const rows = await listCrashLogs();
      const json = JSON.stringify(rows, null, 2);
      console.log("[RMoney] crash log export\n", json);
      return json;
    },
    clear: async () => {
      await clearCrashLogs();
      console.log("[RMoney] crash logs cleared");
    },
  };

  (globalThis as typeof globalThis & { __RMONEY_CRASH_LOGS__?: CrashLogDevTools }).__RMONEY_CRASH_LOGS__ =
    tools;

  console.info(
    "[RMoney] Dev crash tools: globalThis.__RMONEY_CRASH_LOGS__.list() | .export() | .clear()",
  );
}
