/** Key-value app settings (non-financial keys may still reference Plaid metadata). */
export type Setting = {
  key: string;
  value: string;
};

export type SettingRow = {
  key: string;
  value: string;
};

/** Well-known settings keys — values may be sensitive; never log `value`. */
export const SETTING_KEYS = {
  CURRENCY_CODE: "currency_code",
  PLAID_ITEM_ID: "plaid_item_id",
  LAST_SYNC_AT: "last_sync_at",
  /** Non-secret Plaid proxy base URL (e.g. http://127.0.0.1:3001). */
  API_BASE_URL: "api_base_url",
  /** @deprecated Use API_BASE_URL */
  PLAID_PROXY_URL: "plaid_proxy_url",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export function settingFromRow(row: SettingRow): Setting {
  return { key: row.key, value: row.value };
}
