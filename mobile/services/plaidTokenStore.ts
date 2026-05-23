import {
  deleteSecret,
  getSecret,
  saveSecret,
  SECRET_KEYS,
} from "../security/secureStore";
import { safeLogger } from "../security/safeLogger";

/**
 * Plaid access_token lifecycle on-device only.
 * Token is returned from the proxy exchange endpoint then stored here — never logged.
 */

export async function savePlaidAccessToken(accessToken: string): Promise<void> {
  await saveSecret(SECRET_KEYS.PLAID_ACCESS_TOKEN, accessToken);
}

export async function getPlaidAccessToken(): Promise<string | null> {
  return getSecret(SECRET_KEYS.PLAID_ACCESS_TOKEN);
}

export async function clearPlaidAccessToken(): Promise<void> {
  await deleteSecret(SECRET_KEYS.PLAID_ACCESS_TOKEN);
  safeLogger.info("Plaid access token cleared from device");
}
