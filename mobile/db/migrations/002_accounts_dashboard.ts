import type * as SQLite from "expo-sqlite";
import type { Migration } from "./types";

/** Dashboard account fields synced from Plaid. */
export const migration002: Migration = {
  version: 2,
  name: "accounts_dashboard",
  up: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync(`
      ALTER TABLE accounts ADD COLUMN account_name TEXT NOT NULL DEFAULT '';
      ALTER TABLE accounts ADD COLUMN account_type TEXT NOT NULL DEFAULT 'other';
      ALTER TABLE accounts ADD COLUMN subtype TEXT;
      ALTER TABLE accounts ADD COLUMN available_balance REAL NOT NULL DEFAULT 0;
      ALTER TABLE accounts ADD COLUMN last_updated TEXT;
    `);
  },
};
