import type * as SQLite from "expo-sqlite";
import type { Migration } from "./types";

/** Plaid transaction sync fields on existing transactions table. */
export const migration003: Migration = {
  version: 3,
  name: "transactions_plaid",
  up: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync(`
      ALTER TABLE transactions ADD COLUMN plaid_transaction_id TEXT;
      ALTER TABLE transactions ADD COLUMN name TEXT NOT NULL DEFAULT '';
      ALTER TABLE transactions ADD COLUMN pending INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE transactions ADD COLUMN iso_currency_code TEXT;
      ALTER TABLE transactions ADD COLUMN updated_at TEXT;

      UPDATE transactions SET name = transaction_name WHERE name = '';

      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_plaid_transaction_id
        ON transactions (plaid_transaction_id)
        WHERE plaid_transaction_id IS NOT NULL;
    `);
  },
};
