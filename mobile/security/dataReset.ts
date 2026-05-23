import { resetDatabase } from "../db";
import { deleteSecret, SECRET_KEYS } from "./secureStore";
import { safeLogger } from "./safeLogger";

/**
 * Wipes all on-device financial data and secrets.
 * Used by settings "Delete all local data" — no server call required.
 */
export async function wipeAllLocalData(): Promise<void> {
  safeLogger.warn("Starting full local data wipe");

  await deleteSecret(SECRET_KEYS.PLAID_ACCESS_TOKEN);
  await deleteSecret(SECRET_KEYS.API_SHARED_SECRET);
  await deleteSecret(SECRET_KEYS.APP_LOCK_PIN_HASH);

  await resetDatabase();

  safeLogger.warn("Local data wipe complete");
}
