import * as SQLite from "expo-sqlite";
import { getDiagnosticsAppMeta } from "./appMeta";
import type { CrashLogInput, CrashLogRecord } from "./crashLogTypes";

const CRASH_DB_FILE = "rmoney_crash_logs.db";
const MAX_RECORDS = 50;

let crashDb: SQLite.SQLiteDatabase | null = null;
let schemaReady: Promise<void> | null = null;

async function openCrashDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!crashDb) {
    crashDb = await SQLite.openDatabaseAsync(CRASH_DB_FILE);
  }
  return crashDb;
}

async function ensureCrashLogSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = await openCrashDatabase();
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS crash_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recorded_at TEXT NOT NULL,
          error_type TEXT NOT NULL,
          message TEXT NOT NULL,
          stack TEXT,
          component_stack TEXT,
          platform TEXT NOT NULL,
          app_version TEXT NOT NULL,
          build_number TEXT,
          is_fatal INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_crash_logs_recorded_at
          ON crash_logs (recorded_at DESC);
      `);
    })();
  }
  await schemaReady;
}

async function pruneOldRecords(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.runAsync(
    `DELETE FROM crash_logs WHERE id NOT IN (
      SELECT id FROM crash_logs ORDER BY recorded_at DESC, id DESC LIMIT ?
    )`,
    [MAX_RECORDS],
  );
}

export async function appendCrashLog(input: CrashLogInput): Promise<number> {
  await ensureCrashLogSchema();
  const db = await openCrashDatabase();
  const meta = getDiagnosticsAppMeta();
  const recordedAt = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO crash_logs (
      recorded_at, error_type, message, stack, component_stack,
      platform, app_version, build_number, is_fatal
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recordedAt,
      input.error_type,
      input.message.slice(0, 4000),
      input.stack?.slice(0, 12000) ?? null,
      input.component_stack?.slice(0, 12000) ?? null,
      meta.platform,
      meta.appVersion,
      meta.buildNumber,
      input.is_fatal ? 1 : 0,
    ],
  );

  await pruneOldRecords(db);
  return result.lastInsertRowId;
}

type CrashLogRow = {
  id: number;
  recorded_at: string;
  error_type: string;
  message: string;
  stack: string | null;
  component_stack: string | null;
  platform: string;
  app_version: string;
  build_number: string | null;
  is_fatal: number;
};

function rowToRecord(row: CrashLogRow): CrashLogRecord {
  return {
    id: row.id,
    recorded_at: row.recorded_at,
    error_type: row.error_type as CrashLogRecord["error_type"],
    message: row.message,
    stack: row.stack,
    component_stack: row.component_stack,
    platform: row.platform,
    app_version: row.app_version,
    build_number: row.build_number,
    is_fatal: row.is_fatal === 1,
  };
}

export async function listCrashLogs(limit = MAX_RECORDS): Promise<CrashLogRecord[]> {
  await ensureCrashLogSchema();
  const db = await openCrashDatabase();
  const rows = await db.getAllAsync<CrashLogRow>(
    `SELECT * FROM crash_logs ORDER BY recorded_at DESC, id DESC LIMIT ?`,
    [limit],
  );
  return rows.map(rowToRecord);
}

export async function clearCrashLogs(): Promise<void> {
  await ensureCrashLogSchema();
  const db = await openCrashDatabase();
  await db.runAsync("DELETE FROM crash_logs");
}
