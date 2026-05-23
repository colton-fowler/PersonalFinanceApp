import type * as SQLite from "expo-sqlite";
import type { Migration } from "./types";

/** Detected subscription metadata for dashboard. */
export const migration004: Migration = {
  version: 4,
  name: "subscriptions_detected",
  up: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync(`
      ALTER TABLE subscriptions ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
      ALTER TABLE subscriptions ADD COLUMN estimated_amount REAL;
      ALTER TABLE subscriptions ADD COLUMN last_charge_date TEXT;
      ALTER TABLE subscriptions ADD COLUMN confidence TEXT NOT NULL DEFAULT 'low';
      ALTER TABLE subscriptions ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';

      UPDATE subscriptions SET display_name = merchant_name WHERE display_name = '';
      UPDATE subscriptions SET estimated_amount = amount WHERE estimated_amount IS NULL;
    `);
  },
};
