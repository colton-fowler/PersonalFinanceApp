import { openDatabase, withTransaction } from "../connection";
import { runMigrations } from "../migrations";
import { SETTING_KEYS } from "../models/setting";
import { setSetting } from "../repositories/settingsRepository";
import { safeLogger } from "../../security/safeLogger";

/**
 * Opens DB, runs pending migrations, seeds non-sensitive defaults.
 * Call once at app startup before reading financial data.
 */
export async function initializeDatabase(): Promise<void> {
  await openDatabase();
  await runMigrations();
  await setSetting(SETTING_KEYS.CURRENCY_CODE, "USD");
  safeLogger.info("Local database initialized");
}

/**
 * Deletes all financial rows and settings while keeping schema/migrations.
 * Does not remove Secure Store Plaid tokens — use security/dataReset.wipeAllLocalData for full wipe.
 */
export async function resetDatabase(): Promise<void> {
  await withTransaction(async (db) => {
    await db.execAsync(`
      DELETE FROM transactions;
      DELETE FROM transaction_rules;
      DELETE FROM subscriptions;
      DELETE FROM accounts;
      DELETE FROM settings;
    `);
  });
  await setSetting(SETTING_KEYS.CURRENCY_CODE, "USD");
  safeLogger.warn("Local database reset — all financial rows removed");
}
