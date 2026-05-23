import * as SQLite from "expo-sqlite";
import { safeLogger } from "../security/safeLogger";

/** On-disk name; SQLCipher may swap openDatabaseAsync implementation later. */
export const DB_FILE_NAME = "rmoney_local.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Single entry for opening the local DB.
 * TODO (SQLCipher): derive key from Secure Store and use encrypted driver here.
 */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabaseAsync(DB_FILE_NAME);
  safeLogger.info("Local database file opened");
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (!dbInstance) {
    return;
  }
  await dbInstance.closeAsync();
  dbInstance = null;
  safeLogger.info("Local database connection closed");
}

/**
 * Runs work inside a SQLite transaction (expo-sqlite withTransactionAsync).
 * Use for multi-table writes (e.g. Plaid sync batches).
 */
export async function withTransaction<T>(
  fn: (db: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const db = await openDatabase();
  let result!: T;
  await db.withTransactionAsync(async () => {
    result = await fn(db);
  });
  return result;
}
