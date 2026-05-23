import type * as SQLite from "expo-sqlite";
import { openDatabase } from "../connection";
import type { SubscriptionCadence } from "../models/subscription";
import {
  subscriptionDecisionFromRow,
  type SubscriptionDecision,
  type SubscriptionDecisionRow,
} from "../models/subscriptionDecision";
import { createId, isoNow } from "../utils/id";
import {
  normalizeSubscriptionAmount,
  type RejectedSubscriptionPattern,
} from "../../utils/subscriptionPattern";
import { safeLogger } from "../../security/safeLogger";

export async function listIgnoredMerchantKeys(
  db?: SQLite.SQLiteDatabase,
): Promise<Set<string>> {
  const conn = db ?? (await openDatabase());
  const rows = await conn.getAllAsync<{ merchant_key: string }>(
    `SELECT merchant_key FROM subscription_decisions WHERE decision = 'ignored_merchant'`,
  );
  return new Set(rows.map((row) => row.merchant_key));
}

export async function listRejectedSubscriptionPatterns(
  db?: SQLite.SQLiteDatabase,
): Promise<RejectedSubscriptionPattern[]> {
  const conn = db ?? (await openDatabase());
  const rows = await conn.getAllAsync<SubscriptionDecisionRow>(
    `SELECT * FROM subscription_decisions WHERE decision = 'not_subscription'`,
  );

  return rows
    .map(subscriptionDecisionFromRow)
    .filter(
      (row): row is SubscriptionDecision & {
        normalized_amount: number;
        cadence: SubscriptionCadence;
      } => row.normalized_amount !== null && row.cadence !== null,
    )
    .map((row) => ({
      merchant_key: row.merchant_key,
      normalized_amount: row.normalized_amount,
      cadence: row.cadence,
    }));
}

async function getMerchantLevelDecision(
  merchantKey: string,
  decision: "confirmed" | "ignored_merchant",
  db: SQLite.SQLiteDatabase,
): Promise<SubscriptionDecision | null> {
  const row = await db.getFirstAsync<SubscriptionDecisionRow>(
    `SELECT * FROM subscription_decisions
     WHERE merchant_key = ? AND decision = ?`,
    [merchantKey, decision],
  );
  return row ? subscriptionDecisionFromRow(row) : null;
}

async function saveMerchantLevelDecision(
  merchantKey: string,
  decision: "confirmed" | "ignored_merchant",
  displayName: string | null,
  db: SQLite.SQLiteDatabase,
): Promise<SubscriptionDecision> {
  const now = isoNow();
  const existing = await getMerchantLevelDecision(merchantKey, decision, db);

  if (existing) {
    await db.runAsync(
      `UPDATE subscription_decisions
       SET display_name = ?, updated_at = ?
       WHERE id = ?`,
      [displayName, now, existing.id],
    );
  } else {
    await db.runAsync(
      `INSERT INTO subscription_decisions (
        id, merchant_key, decision, display_name, normalized_amount, cadence,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`,
      [createId(), merchantKey, decision, displayName, now, now],
    );
  }

  const saved = await getMerchantLevelDecision(merchantKey, decision, db);
  if (!saved) {
    throw new Error("Subscription decision save failed");
  }

  safeLogger.debug("Subscription decision saved", { rowCount: 1 });
  return saved;
}

export async function saveConfirmedMerchantDecision(
  merchantKey: string,
  displayName?: string | null,
  db?: SQLite.SQLiteDatabase,
): Promise<SubscriptionDecision> {
  const conn = db ?? (await openDatabase());
  return saveMerchantLevelDecision(
    merchantKey,
    "confirmed",
    displayName?.trim() || null,
    conn,
  );
}

export async function saveIgnoredMerchantDecision(
  merchantKey: string,
  displayName?: string | null,
  db?: SQLite.SQLiteDatabase,
): Promise<SubscriptionDecision> {
  const conn = db ?? (await openDatabase());
  return saveMerchantLevelDecision(
    merchantKey,
    "ignored_merchant",
    displayName?.trim() || null,
    conn,
  );
}

/** Records a rejected detected pattern (merchant + amount + cadence). */
export async function saveRejectedSubscriptionPattern(
  merchantKey: string,
  estimatedAmount: number,
  cadence: SubscriptionCadence,
  displayName?: string | null,
  db?: SQLite.SQLiteDatabase,
): Promise<SubscriptionDecision> {
  const conn = db ?? (await openDatabase());
  const normalizedAmount = normalizeSubscriptionAmount(estimatedAmount);
  const now = isoNow();
  const label = displayName?.trim() || null;

  const existing = await conn.getFirstAsync<SubscriptionDecisionRow>(
    `SELECT * FROM subscription_decisions
     WHERE merchant_key = ? AND decision = 'not_subscription'
       AND normalized_amount = ? AND cadence = ?`,
    [merchantKey, normalizedAmount, cadence],
  );

  if (existing) {
    await conn.runAsync(
      `UPDATE subscription_decisions
       SET display_name = ?, updated_at = ?
       WHERE id = ?`,
      [label ?? existing.display_name, now, existing.id],
    );
  } else {
    await conn.runAsync(
      `INSERT INTO subscription_decisions (
        id, merchant_key, decision, display_name, normalized_amount, cadence,
        created_at, updated_at
      ) VALUES (?, ?, 'not_subscription', ?, ?, ?, ?, ?)`,
      [createId(), merchantKey, label, normalizedAmount, cadence, now, now],
    );
  }

  const saved = await conn.getFirstAsync<SubscriptionDecisionRow>(
    `SELECT * FROM subscription_decisions
     WHERE merchant_key = ? AND decision = 'not_subscription'
       AND normalized_amount = ? AND cadence = ?`,
    [merchantKey, normalizedAmount, cadence],
  );

  if (!saved) {
    throw new Error("Rejected subscription pattern save failed");
  }

  safeLogger.debug("Rejected subscription pattern saved", { rowCount: 1 });
  return subscriptionDecisionFromRow(saved);
}
