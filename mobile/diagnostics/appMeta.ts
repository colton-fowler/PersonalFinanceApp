import { Platform } from "react-native";

/** Best-effort app metadata for crash records (no native build deps required). */
export function getDiagnosticsAppMeta(): {
  platform: string;
  appVersion: string;
  buildNumber: string | null;
} {
  let appVersion = "1.0.0";
  let buildNumber: string | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants").default as {
      expoConfig?: { version?: string; android?: { versionCode?: number }; ios?: { buildNumber?: string } };
      nativeBuildVersion?: string;
    };
    appVersion = Constants.expoConfig?.version ?? appVersion;
    buildNumber =
      Constants.nativeBuildVersion ??
      (Constants.expoConfig?.ios?.buildNumber != null
        ? String(Constants.expoConfig.ios.buildNumber)
        : Constants.expoConfig?.android?.versionCode != null
          ? String(Constants.expoConfig.android.versionCode)
          : null);
  } catch {
    // expo-constants optional at runtime
  }

  return {
    platform: Platform.OS,
    appVersion,
    buildNumber,
  };
}
