import type * as SQLite from "expo-sqlite";
import type { Migration } from "./types";

/**
 * Baseline schema — all financial tables live on device only.
 * SQLCipher: same DDL; encryption wraps the file at openDatabase time.
 */
export const migration001: Migration = {
  version: 1,
  name: "initial",
  up: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY NOT NULL,
        plaid_account_id TEXT,
        institution_name TEXT NOT NULL,
        current_balance REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL,
        transaction_name TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        transaction_date TEXT NOT NULL,
        merchant_name TEXT,
        recurring INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_account_id
        ON transactions (account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date
        ON transactions (transaction_date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category
        ON transactions (category);

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY NOT NULL,
        merchant_name TEXT NOT NULL,
        amount REAL NOT NULL,
        next_charge_date TEXT NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'monthly'
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  },
};
