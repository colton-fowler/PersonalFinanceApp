import type * as SQLite from "expo-sqlite";
import type { Migration } from "./types";

/** Merchant → category rules applied on Plaid sync (unless manual override). */
export const migration006: Migration = {
  version: 6,
  name: "transaction_rules",
  up: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transaction_rules (
        id TEXT PRIMARY KEY NOT NULL,
        merchant_key TEXT NOT NULL,
        merchant_name TEXT,
        category TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_rules_merchant_key
        ON transaction_rules (merchant_key);
    `);
  },
};
