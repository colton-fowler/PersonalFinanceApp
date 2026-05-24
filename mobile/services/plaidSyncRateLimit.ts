import { SETTING_KEYS, type SettingKey } from "../db/models/setting";
import { getSetting } from "../db/repositories/settingsRepository";

/** Dev/personal-use Plaid sync intervals — limits free-tier API usage. */
export const PLAID_SYNC_INTERVALS_MS = {
  auto: 30 * 60 * 1000,
  manual: 2 * 60 * 1000,
  balance: 15 * 60 * 1000,
} as const;

export type PlaidSyncRateLimitKind = keyof typeof PLAID_SYNC_INTERVALS_MS;

export type PlaidSyncRateLimitCheck = {
  allowed: boolean;
  lastAt: string | null;
  nextAllowedAt: string | null;
  msUntilAllowed: number;
};

function parseIsoTimestamp(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function computeRateLimitCheck(
  lastAtIso: string | null | undefined,
  intervalMs: number,
  now = Date.now(),
): PlaidSyncRateLimitCheck {
  const lastAtDate = parseIsoTimestamp(lastAtIso);
  if (!lastAtDate) {
    return {
      allowed: true,
      lastAt: null,
      nextAllowedAt: null,
      msUntilAllowed: 0,
    };
  }

  const lastAtMs = lastAtDate.getTime();
  const nextAllowedMs = lastAtMs + intervalMs;
  const msUntilAllowed = Math.max(0, nextAllowedMs - now);

  return {
    allowed: msUntilAllowed === 0,
    lastAt: lastAtDate.toISOString(),
    nextAllowedAt:
      msUntilAllowed === 0 ? null : new Date(nextAllowedMs).toISOString(),
    msUntilAllowed,
  };
}

async function readTimestamp(key: SettingKey): Promise<string | null> {
  const setting = await getSetting(key);
  return setting?.value ?? null;
}

/** First non-null timestamp among keys (newest wins for throttle fallback). */
async function readNewestTimestamp(keys: SettingKey[]): Promise<string | null> {
  let newest: Date | null = null;
  let newestIso: string | null = null;

  for (const key of keys) {
    const iso = await readTimestamp(key);
    const parsed = parseIsoTimestamp(iso);
    if (!parsed) {
      continue;
    }
    if (!newest || parsed.getTime() > newest.getTime()) {
      newest = parsed;
      newestIso = parsed.toISOString();
    }
  }

  return newestIso;
}

export async function checkAutoPlaidSyncAllowed(
  now = Date.now(),
): Promise<PlaidSyncRateLimitCheck> {
  const lastAt = await readNewestTimestamp([
    SETTING_KEYS.LAST_PLAID_SYNC_AT,
    SETTING_KEYS.LAST_SYNC_AT,
  ]);
  return computeRateLimitCheck(lastAt, PLAID_SYNC_INTERVALS_MS.auto, now);
}

export async function checkManualPlaidRefreshAllowed(
  now = Date.now(),
): Promise<PlaidSyncRateLimitCheck> {
  const lastAt = await readTimestamp(SETTING_KEYS.LAST_PLAID_MANUAL_REFRESH_AT);
  return computeRateLimitCheck(lastAt, PLAID_SYNC_INTERVALS_MS.manual, now);
}

export async function checkBalancePlaidSyncAllowed(
  now = Date.now(),
): Promise<PlaidSyncRateLimitCheck> {
  const lastAt = await readNewestTimestamp([
    SETTING_KEYS.LAST_PLAID_BALANCE_SYNC_AT,
    SETTING_KEYS.LAST_PLAID_SYNC_AT,
    SETTING_KEYS.LAST_SYNC_AT,
  ]);
  return computeRateLimitCheck(lastAt, PLAID_SYNC_INTERVALS_MS.balance, now);
}

export function formatMsUntilAllowed(ms: number): string {
  if (ms <= 0) {
    return "now";
  }

  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
  }

  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const totalHours = Math.ceil(totalMinutes / 60);
  return `${totalHours} hour${totalHours === 1 ? "" : "s"}`;
}
