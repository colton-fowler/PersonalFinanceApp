import type * as SQLite from "expo-sqlite";
import type { Migration } from "./types";

/** Pattern-specific not_subscription rows; merchant-level confirmed/ignored indexes. */
export const migration008: Migration = {
  version: 8,
  name: "subscription_decision_patterns",
  up: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync(`
      ALTER TABLE subscription_decisions ADD COLUMN normalized_amount REAL;
      ALTER TABLE subscription_decisions ADD COLUMN cadence TEXT;

      DELETE FROM subscription_decisions
      WHERE decision = 'not_subscription' AND normalized_amount IS NULL;

      DROP INDEX IF EXISTS idx_subscription_decisions_merchant_key;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_decisions_merchant_confirmed
        ON subscription_decisions (merchant_key)
        WHERE decision = 'confirmed';

      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_decisions_merchant_ignored
        ON subscription_decisions (merchant_key)
        WHERE decision = 'ignored_merchant';

      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_decisions_pattern_reject
        ON subscription_decisions (merchant_key, normalized_amount, cadence)
        WHERE decision = 'not_subscription';
    `);
  },
};
