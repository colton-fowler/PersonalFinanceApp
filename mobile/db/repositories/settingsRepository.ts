import type * as SQLite from "expo-sqlite";
import { openDatabase } from "../connection";
import {
  settingFromRow,
  type Setting,
  type SettingKey,
  type SettingRow,
} from "../models/setting";
import { safeLogger } from "../../security/safeLogger";

export async function getSetting(
  key: SettingKey | string,
  db?: SQLite.SQLiteDatabase,
): Promise<Setting | null> {
  const conn = db ?? (await openDatabase());
  const row = await conn.getFirstAsync<SettingRow>(
    "SELECT key, value FROM settings WHERE key = ?",
    [key],
  );
  return row ? settingFromRow(row) : null;
}

export async function setSetting(
  key: SettingKey | string,
  value: string,
  db?: SQLite.SQLiteDatabase,
): Promise<Setting> {
  const conn = db ?? (await openDatabase());
  // Value may contain tokens or URLs — never log key/value pairs together.
  await conn.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
  safeLogger.debug("Setting upserted", { keyName: key });
  const row = await getSetting(key, conn);
  if (!row) {
    throw new Error("Setting upsert failed");
  }
  return row;
}

export async function deleteSetting(
  key: SettingKey | string,
  db?: SQLite.SQLiteDatabase,
): Promise<boolean> {
  const conn = db ?? (await openDatabase());
  const result = await conn.runAsync("DELETE FROM settings WHERE key = ?", [
    key,
  ]);
  safeLogger.debug("Setting deleted", { keyName: key, changes: result.changes });
  return result.changes > 0;
}

export async function listSettings(
  db?: SQLite.SQLiteDatabase,
): Promise<Setting[]> {
  const conn = db ?? (await openDatabase());
  const rows = await conn.getAllAsync<SettingRow>(
    "SELECT key, value FROM settings ORDER BY key ASC",
  );
  safeLogger.debug("Settings listed", { count: rows.length });
  return rows.map(settingFromRow);
}
