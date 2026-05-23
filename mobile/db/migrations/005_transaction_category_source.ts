import type * as SQLite from "expo-sqlite";
import type { Migration } from "./types";

/** Tracks whether category came from Plaid sync or user override. */
export const migration005: Migration = {
  version: 5,
  name: "transaction_category_source",
  up: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync(`
      ALTER TABLE transactions ADD COLUMN category_source TEXT NOT NULL DEFAULT 'plaid';
    `);
  },
};
