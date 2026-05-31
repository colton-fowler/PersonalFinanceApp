import { initializeDatabase, resetDatabase } from "../db";
import { deleteSecret, SECRET_KEYS } from "./secureStore";
import { safeLogger } from "./safeLogger";

/**
 * Wipes all on-device financial data and secrets.
 * Used by settings disconnect/reset — no server call required.
 */
export async function wipeAllLocalData(): Promise<void> {
  safeLogger.warn("Starting full local data wipe");

  await deleteSecret(SECRET_KEYS.PLAID_ACCESS_TOKEN);
  await deleteSecret(SECRET_KEYS.API_SHARED_SECRET);
  await deleteSecret(SECRET_KEYS.APP_LOCK_PIN_HASH);

  await resetDatabase();
  await initializeDatabase();

  safeLogger.warn("Local data wipe complete");
}

/**
 * Clears SQLite financial rows and sync timestamps while keeping Plaid credentials.
 */
export async function clearLocalFinancialData(): Promise<void> {
  safeLogger.warn("Clearing local financial database");
  await resetDatabase();
  await initializeDatabase();
  safeLogger.warn("Local financial database cleared");
}
