import * as SecureStore from "expo-secure-store";
import { safeLogger } from "./safeLogger";

/**
 * Reserved Secure Store keys — names only; never put secret values in source or SQLite.
 *
 * Plaid access_token:
 * - Stored here after proxy exchange, never in the mobile bundle or git.
 * - Never log the token value (use safeLogger with keyName only).
 * - Never commit .env or debug dumps containing tokens.
 */
export const SECRET_KEYS = {
  PLAID_ACCESS_TOKEN: "plaid_access_token",
  /** Bearer token for private proxy — must match server API_SHARED_SECRET; never commit. */
  API_SHARED_SECRET: "api_shared_secret",
  APP_LOCK_PIN_HASH: "app_lock_pin_hash",
} as const;

export type SecretKey = (typeof SECRET_KEYS)[keyof typeof SECRET_KEYS];

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** Writes a secret to the OS keychain/keystore. Never log `value`. */
export async function saveSecret(key: SecretKey, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
  safeLogger.info("Secret stored", { keyName: key });
}

/** Reads a secret. Return value must not be logged or included in analytics. */
export async function getSecret(key: SecretKey): Promise<string | null> {
  const value = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  safeLogger.debug("Secret read attempted", { keyName: key, found: Boolean(value) });
  return value;
}

export async function deleteSecret(key: SecretKey): Promise<void> {
  await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
  safeLogger.info("Secret deleted", { keyName: key });
}

/** Whether a non-empty secret exists — does not log the stored value. */
export async function hasSecret(key: SecretKey): Promise<boolean> {
  const value = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  return value !== null && value.length > 0;
}
