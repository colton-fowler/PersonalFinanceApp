import type * as SQLite from "expo-sqlite";
import type { Migration } from "./types";

/** User review decisions for detected subscriptions (confirm / reject / ignore). */
export const migration007: Migration = {
  version: 7,
  name: "subscription_decisions",
  up: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS subscription_decisions (
        id TEXT PRIMARY KEY NOT NULL,
        merchant_key TEXT NOT NULL,
        decision TEXT NOT NULL,
        display_name TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_decisions_merchant_key
        ON subscription_decisions (merchant_key);
    `);
  },
};
