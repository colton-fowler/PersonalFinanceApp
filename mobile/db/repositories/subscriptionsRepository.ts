import type * as SQLite from "expo-sqlite";
import { openDatabase } from "../connection";
import {
  subscriptionFromRow,
  type Subscription,
  type SubscriptionInsert,
  type SubscriptionRow,
  type SubscriptionUpdate,
} from "../models/subscription";
import { createId } from "../utils/id";
import { safeLogger } from "../../security/safeLogger";

export async function createSubscription(
  input: SubscriptionInsert,
  db?: SQLite.SQLiteDatabase,
): Promise<Subscription> {
  const conn = db ?? (await openDatabase());
  const id = input.id ?? createId();

  await conn.runAsync(
    `INSERT INTO subscriptions (
      id, merchant_name, display_name, amount, estimated_amount,
      next_charge_date, frequency, last_charge_date, confidence, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.merchant_name,
      input.display_name,
      input.estimated_amount,
      input.estimated_amount,
      input.next_estimated_charge_date,
      input.cadence,
      input.last_charge_date,
      input.confidence,
      input.source,
    ],
  );

  safeLogger.debug("Subscription row inserted", { rowCount: 1 });
  const row = await getSubscriptionById(id, conn);
  if (!row) {
    throw new Error("Subscription insert failed");
  }
  return row;
}

export async function getSubscriptionById(
  id: string,
  db?: SQLite.SQLiteDatabase,
): Promise<Subscription | null> {
  const conn = db ?? (await openDatabase());
  const row = await conn.getFirstAsync<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE id = ?",
    [id],
  );
  return row ? subscriptionFromRow(row) : null;
}

export async function listSubscriptions(
  db?: SQLite.SQLiteDatabase,
): Promise<Subscription[]> {
  const conn = db ?? (await openDatabase());
  const rows = await conn.getAllAsync<SubscriptionRow>(
    "SELECT * FROM subscriptions ORDER BY next_charge_date ASC",
  );
  safeLogger.debug("Subscriptions listed", { count: rows.length });
  return rows.map(subscriptionFromRow);
}

export async function listDetectedSubscriptions(
  db?: SQLite.SQLiteDatabase,
): Promise<Subscription[]> {
  const conn = db ?? (await openDatabase());
  const rows = await conn.getAllAsync<SubscriptionRow>(
    `SELECT * FROM subscriptions
     WHERE source = 'detected'
     ORDER BY next_charge_date ASC`,
  );
  safeLogger.debug("Detected subscriptions listed", { count: rows.length });
  return rows.map(subscriptionFromRow);
}

export async function replaceDetectedSubscriptions(
  subscriptions: SubscriptionInsert[],
  db?: SQLite.SQLiteDatabase,
): Promise<number> {
  const conn = db ?? (await openDatabase());

  await conn.runAsync("DELETE FROM subscriptions WHERE source = 'detected'");

  for (const subscription of subscriptions) {
    await createSubscription({ ...subscription, source: "detected" }, conn);
  }

  safeLogger.debug("Detected subscriptions replaced", {
    count: subscriptions.length,
  });
  return subscriptions.length;
}

export async function updateSubscription(
  id: string,
  patch: SubscriptionUpdate,
  db?: SQLite.SQLiteDatabase,
): Promise<Subscription | null> {
  const conn = db ?? (await openDatabase());
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (patch.merchant_name !== undefined) {
    fields.push("merchant_name = ?");
    values.push(patch.merchant_name);
  }
  if (patch.display_name !== undefined) {
    fields.push("display_name = ?");
    values.push(patch.display_name);
  }
  if (patch.estimated_amount !== undefined) {
    fields.push("estimated_amount = ?", "amount = ?");
    values.push(patch.estimated_amount, patch.estimated_amount);
  }
  if (patch.next_estimated_charge_date !== undefined) {
    fields.push("next_charge_date = ?");
    values.push(patch.next_estimated_charge_date);
  }
  if (patch.cadence !== undefined) {
    fields.push("frequency = ?");
    values.push(patch.cadence);
  }
  if (patch.last_charge_date !== undefined) {
    fields.push("last_charge_date = ?");
    values.push(patch.last_charge_date);
  }
  if (patch.confidence !== undefined) {
    fields.push("confidence = ?");
    values.push(patch.confidence);
  }
  if (patch.source !== undefined) {
    fields.push("source = ?");
    values.push(patch.source);
  }

  if (fields.length === 0) {
    return getSubscriptionById(id, conn);
  }

  values.push(id);
  await conn.runAsync(
    `UPDATE subscriptions SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  safeLogger.debug("Subscription row updated", { rowCount: 1 });
  return getSubscriptionById(id, conn);
}

export async function deleteSubscription(
  id: string,
  db?: SQLite.SQLiteDatabase,
): Promise<boolean> {
  const conn = db ?? (await openDatabase());
  const result = await conn.runAsync("DELETE FROM subscriptions WHERE id = ?", [
    id,
  ]);
  safeLogger.debug("Subscription row deleted", { changes: result.changes });
  return result.changes > 0;
}
