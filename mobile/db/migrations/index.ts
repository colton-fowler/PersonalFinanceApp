import type * as SQLite from "expo-sqlite";
import { openDatabase } from "../connection";
import { safeLogger } from "../../security/safeLogger";
import { migration001 } from "./001_initial";
import { migration002 } from "./002_accounts_dashboard";
import { migration003 } from "./003_transactions_plaid";
import { migration004 } from "./004_subscriptions_detected";
import type { Migration } from "./types";

/** Ordered migrations — append-only; never edit applied versions. */
const MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
];

async function ensureMigrationsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

async function getAppliedVersions(db: SQLite.SQLiteDatabase): Promise<Set<number>> {
  await ensureMigrationsTable(db);
  const rows = await db.getAllAsync<{ version: number }>(
    "SELECT version FROM schema_migrations ORDER BY version ASC",
  );
  return new Set(rows.map((r) => r.version));
}

async function recordMigration(db: SQLite.SQLiteDatabase, version: number): Promise<void> {
  await db.runAsync(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, datetime('now'))",
    [version],
  );
}

/**
 * Applies pending migrations idempotently.
 * Logs only version numbers — never migration SQL containing table/column names in debug meta.
 */
export async function runMigrations(): Promise<number> {
  const db = await openDatabase();
  const applied = await getAppliedVersions(db);
  let appliedCount = 0;

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) {
      continue;
    }

    safeLogger.info("Applying DB migration", { version: migration.version });
    await migration.up(db);
    await recordMigration(db, migration.version);
    appliedCount += 1;
  }

  safeLogger.info("DB migrations complete", {
    appliedCount,
    totalVersions: MIGRATIONS.length,
  });
  return appliedCount;
}

export function getLatestMigrationVersion(): number {
  return MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
}
