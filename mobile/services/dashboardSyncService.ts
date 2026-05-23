import { SETTING_KEYS } from "../db/models/setting";
import { setSetting } from "../db/repositories/settingsRepository";
import { isoNow } from "../db/utils/id";
import { safeLogger } from "../security/safeLogger";
import { syncAccountsFromPlaid } from "./accountSyncService";
import { detectAndStoreSubscriptions } from "./subscriptionDetectionService";
import { syncTransactionsFromPlaid } from "./transactionSyncService";

export type DashboardSyncResult = {
  accountCount: number;
  transactionCount: number;
  subscriptionCount: number;
  lastSyncedAt: string;
};

export async function syncDashboardFromPlaid(): Promise<DashboardSyncResult> {
  const accountCount = await syncAccountsFromPlaid();
  const transactionCount = await syncTransactionsFromPlaid();
  const subscriptionCount = await detectAndStoreSubscriptions();
  const lastSyncedAt = isoNow();

  await setSetting(SETTING_KEYS.LAST_SYNC_AT, lastSyncedAt);

  safeLogger.info("Dashboard sync completed", {
    accountCount,
    transactionCount,
    subscriptionCount,
  });

  return { accountCount, transactionCount, subscriptionCount, lastSyncedAt };
}
