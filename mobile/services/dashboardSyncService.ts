import { SETTING_KEYS } from "../db/models/setting";
import { setSetting } from "../db/repositories/settingsRepository";
import { isoNow } from "../db/utils/id";
import { safeLogger } from "../security/safeLogger";
import { syncAccountsFromPlaid } from "./accountSyncService";
import {
  checkAutoPlaidSyncAllowed,
  checkBalancePlaidSyncAllowed,
  checkManualPlaidRefreshAllowed,
  formatMsUntilAllowed,
} from "./plaidSyncRateLimit";
import { detectAndStoreSubscriptions } from "./subscriptionDetectionService";
import { syncTransactionsFromPlaid } from "./transactionSyncService";

export type PlaidSyncMode = "auto" | "manual";

export type DashboardSyncSkipped = {
  skipped: true;
  reason: string;
  nextAllowedAt: string;
};

export type DashboardSyncCompleted = {
  skipped: false;
  accountCount: number;
  transactionCount: number;
  subscriptionCount: number;
  lastSyncedAt: string;
  balancesSkipped: boolean;
};

export type DashboardSyncResult = DashboardSyncSkipped | DashboardSyncCompleted;

export type SyncDashboardOptions = {
  mode?: PlaidSyncMode;
};

let dashboardSyncInFlight: Promise<DashboardSyncResult> | null = null;

function logSyncSkipped(
  mode: PlaidSyncMode,
  reason: string,
  nextAllowedAt: string,
  msUntilAllowed: number,
): DashboardSyncSkipped {
  const result: DashboardSyncSkipped = {
    skipped: true,
    reason,
    nextAllowedAt,
  };

  safeLogger.info("Plaid sync skipped", {
    mode,
    reason,
    nextAllowedAt,
    waitLabel: formatMsUntilAllowed(msUntilAllowed),
  });

  if (__DEV__) {
    console.info(
      "[RMoney] Plaid sync skipped:",
      reason,
      `(next in ${formatMsUntilAllowed(msUntilAllowed)})`,
    );
  }

  return result;
}

async function runDashboardSync(
  mode: PlaidSyncMode,
): Promise<DashboardSyncResult> {
  const rateCheck =
    mode === "manual"
      ? await checkManualPlaidRefreshAllowed()
      : await checkAutoPlaidSyncAllowed();

  if (!rateCheck.allowed && rateCheck.nextAllowedAt) {
    return logSyncSkipped(
      mode,
      "Synced recently",
      rateCheck.nextAllowedAt,
      rateCheck.msUntilAllowed,
    );
  }

  safeLogger.info("Plaid sync started", { mode });

  if (__DEV__) {
    console.info("[RMoney] Plaid sync started", { mode });
  }

  const balanceCheck = await checkBalancePlaidSyncAllowed();
  let accountCount = 0;
  let balancesSkipped = false;
  const syncStartedAt = isoNow();

  if (balanceCheck.allowed) {
    accountCount = await syncAccountsFromPlaid();
    await setSetting(SETTING_KEYS.LAST_PLAID_BALANCE_SYNC_AT, syncStartedAt);
  } else {
    balancesSkipped = true;
    safeLogger.info("Plaid balance sync skipped", {
      nextAllowedAt: balanceCheck.nextAllowedAt,
      waitLabel: formatMsUntilAllowed(balanceCheck.msUntilAllowed),
    });
    if (__DEV__ && balanceCheck.nextAllowedAt) {
      console.info(
        "[RMoney] Plaid balance sync skipped",
        `(next in ${formatMsUntilAllowed(balanceCheck.msUntilAllowed)})`,
      );
    }
  }

  const transactionCount = await syncTransactionsFromPlaid();
  const subscriptionCount = await detectAndStoreSubscriptions();
  const lastSyncedAt = isoNow();

  await Promise.all([
    setSetting(SETTING_KEYS.LAST_SYNC_AT, lastSyncedAt),
    setSetting(SETTING_KEYS.LAST_PLAID_SYNC_AT, lastSyncedAt),
    mode === "manual"
      ? setSetting(SETTING_KEYS.LAST_PLAID_MANUAL_REFRESH_AT, lastSyncedAt)
      : Promise.resolve(),
  ]);

  safeLogger.info("Dashboard sync completed", {
    mode,
    accountCount,
    transactionCount,
    subscriptionCount,
    balancesSkipped,
  });

  if (__DEV__) {
    console.info("[RMoney] Plaid sync completed", {
      mode,
      accountCount,
      transactionCount,
      subscriptionCount,
      balancesSkipped,
    });
  }

  return {
    skipped: false,
    accountCount,
    transactionCount,
    subscriptionCount,
    lastSyncedAt,
    balancesSkipped,
  };
}

/**
 * Syncs dashboard data from Plaid with dev-friendly rate limits and in-flight deduping.
 */
export async function syncDashboardFromPlaid(
  options: SyncDashboardOptions = {},
): Promise<DashboardSyncResult> {
  const mode = options.mode ?? "auto";

  if (dashboardSyncInFlight) {
    safeLogger.info("Plaid sync reusing in-flight request", { mode });
    if (__DEV__) {
      console.info("[RMoney] Plaid sync reusing in-flight request");
    }
    return dashboardSyncInFlight;
  }

  const syncPromise = runDashboardSync(mode).finally(() => {
    if (dashboardSyncInFlight === syncPromise) {
      dashboardSyncInFlight = null;
    }
  });

  dashboardSyncInFlight = syncPromise;
  return syncPromise;
}
