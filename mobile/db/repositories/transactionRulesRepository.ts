import type * as SQLite from "expo-sqlite";
import { openDatabase } from "../connection";
import {
  transactionRuleFromRow,
  type TransactionRule,
  type TransactionRuleRow,
} from "../models/transactionRule";
import { createId, isoNow } from "../utils/id";
import { toMerchantKey } from "../../utils/merchantKey";
import { safeLogger } from "../../security/safeLogger";

export async function findRuleByMerchantKey(
  merchantKeyOrLabel: string,
  db?: SQLite.SQLiteDatabase,
): Promise<TransactionRule | null> {
  const merchantKey = toMerchantKey(merchantKeyOrLabel);
  if (!merchantKey) {
    return null;
  }

  const conn = db ?? (await openDatabase());
  const row = await conn.getFirstAsync<TransactionRuleRow>(
    "SELECT * FROM transaction_rules WHERE merchant_key = ?",
    [merchantKey],
  );
  return row ? transactionRuleFromRow(row) : null;
}

/** Creates or updates a merchant rule (one rule per normalized merchant_key). */
export async function upsertTransactionRuleByMerchantKey(
  merchantKeyOrLabel: string,
  category: string,
  merchantName?: string | null,
  db?: SQLite.SQLiteDatabase,
): Promise<TransactionRule> {
  const merchantKey = toMerchantKey(merchantKeyOrLabel);
  if (!merchantKey) {
    throw new Error("Merchant key is required");
  }

  const conn = db ?? (await openDatabase());
  const existing = await findRuleByMerchantKey(merchantKey, conn);
  const now = isoNow();
  const displayName =
    merchantName?.trim() || existing?.merchant_name || merchantKeyOrLabel.trim();

  if (existing) {
    await conn.runAsync(
      `UPDATE transaction_rules
       SET category = ?, merchant_name = ?, updated_at = ?
       WHERE merchant_key = ?`,
      [category, displayName || null, now, merchantKey],
    );
    const updated = await findRuleByMerchantKey(merchantKey, conn);
    if (!updated) {
      throw new Error("Transaction rule update failed");
    }
    safeLogger.debug("Transaction rule updated", { rowCount: 1 });
    return updated;
  }

  const id = createId();
  await conn.runAsync(
    `INSERT INTO transaction_rules (
      id, merchant_key, merchant_name, category, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, merchantKey, merchantName ?? null, category, now, now],
  );

  const created = await findRuleByMerchantKey(merchantKey, conn);
  if (!created) {
    throw new Error("Transaction rule insert failed");
  }
  safeLogger.debug("Transaction rule inserted", { rowCount: 1 });
  return created;
}
