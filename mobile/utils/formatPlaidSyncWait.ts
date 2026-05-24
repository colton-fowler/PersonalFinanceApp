import { formatMsUntilAllowed } from "../services/plaidSyncRateLimit";

export function formatManualRefreshThrottleMessage(nextAllowedAt: string): string {
  const msUntil = Math.max(0, new Date(nextAllowedAt).getTime() - Date.now());
  const waitLabel = formatMsUntilAllowed(msUntil);
  return `Synced recently — try again in ${waitLabel}.`;
}
