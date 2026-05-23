import type * as SQLite from "expo-sqlite";
import { openDatabase } from "../connection";
import {
  transactionFromRow,
  type Transaction,
  type TransactionInsert,
  type TransactionRow,
  type TransactionUpdate,
} from "../models/transaction";
import { createId, isoNow } from "../utils/id";
import { safeLogger } from "../../security/safeLogger";
import { resolveCategoryForPlaidSync } from "../../services/transactionCategoryResolver";

export async function createTransaction(
  input: TransactionInsert,
  db?: SQLite.SQLiteDatabase,
): Promise<Transaction> {
  const conn = db ?? (await openDatabase());
  const id = input.id ?? createId();
  const createdAt = input.created_at ?? isoNow();
  const updatedAt = input.updated_at ?? createdAt;
  const pending = input.pending ? 1 : 0;
  const categorySource = input.category_source ?? "plaid";

  await conn.runAsync(
    `INSERT INTO transactions (
      id, plaid_transaction_id, account_id, transaction_name, name, amount, category,
      category_source, transaction_date, merchant_name, recurring, pending,
      iso_currency_code, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    [
      id,
      input.plaid_transaction_id ?? null,
      input.account_id,
      input.name,
      input.name,
      input.amount,
      input.category,
      categorySource,
      input.date,
      input.merchant_name ?? null,
      pending,
      input.iso_currency_code ?? null,
      createdAt,
      updatedAt,
    ],
  );

  safeLogger.debug("Transaction row inserted", { rowCount: 1 });
  const row = await getTransactionById(id, conn);
  if (!row) {
    throw new Error("Transaction insert failed");
  }
  return row;
}

export async function upsertTransactionByPlaidId(
  input: TransactionInsert & { plaid_transaction_id: string },
  db?: SQLite.SQLiteDatabase,
): Promise<Transaction> {
  const conn = db ?? (await openDatabase());
  const existing = await conn.getFirstAsync<TransactionRow>(
    "SELECT * FROM transactions WHERE plaid_transaction_id = ?",
    [input.plaid_transaction_id],
  );

  if (existing) {
    const existingTx = transactionFromRow(existing);
    const preserveManualCategory = existingTx.category_source === "manual";
    const resolved = preserveManualCategory
      ? null
      : await resolveCategoryForPlaidSync(
          input.merchant_name ?? null,
          input.name,
          input.category,
        );

    const updated = await updateTransaction(
      existing.id,
      {
        name: input.name,
        merchant_name: input.merchant_name ?? null,
        amount: input.amount,
        date: input.date,
        ...(preserveManualCategory
          ? {}
          : {
              category: resolved!.category,
              category_source: resolved!.category_source,
            }),
        pending: input.pending ?? false,
        iso_currency_code: input.iso_currency_code ?? null,
        updated_at: input.updated_at ?? isoNow(),
      },
      conn,
    );
    if (!updated) {
      throw new Error("Transaction update failed");
    }
    return updated;
  }

  const resolved = await resolveCategoryForPlaidSync(
    input.merchant_name ?? null,
    input.name,
    input.category,
  );

  return createTransaction(
    {
      ...input,
      category: resolved.category,
      category_source: resolved.category_source,
    },
    conn,
  );
}

export async function getTransactionById(
  id: string,
  db?: SQLite.SQLiteDatabase,
): Promise<Transaction | null> {
  const conn = db ?? (await openDatabase());
  const row = await conn.getFirstAsync<TransactionRow>(
    "SELECT * FROM transactions WHERE id = ?",
    [id],
  );
  return row ? transactionFromRow(row) : null;
}

export async function listRecentTransactions(
  limit = 30,
  db?: SQLite.SQLiteDatabase,
): Promise<Transaction[]> {
  const conn = db ?? (await openDatabase());
  const rows = await conn.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions
     ORDER BY transaction_date DESC, created_at DESC
     LIMIT ?`,
    [limit],
  );
  safeLogger.debug("Recent transactions listed", { count: rows.length });
  return rows.map(transactionFromRow);
}

export async function listAllTransactions(
  db?: SQLite.SQLiteDatabase,
): Promise<Transaction[]> {
  const conn = db ?? (await openDatabase());
  const rows = await conn.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions ORDER BY transaction_date ASC`,
  );
  safeLogger.debug("All transactions listed", { count: rows.length });
  return rows.map(transactionFromRow);
}

export async function listTransactionsByAccount(
  accountId: string,
  db?: SQLite.SQLiteDatabase,
): Promise<Transaction[]> {
  const conn = db ?? (await openDatabase());
  const rows = await conn.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions WHERE account_id = ?
     ORDER BY transaction_date DESC, created_at DESC`,
    [accountId],
  );
  safeLogger.debug("Transactions listed for account", { count: rows.length });
  return rows.map(transactionFromRow);
}

export async function updateTransaction(
  id: string,
  patch: TransactionUpdate,
  db?: SQLite.SQLiteDatabase,
): Promise<Transaction | null> {
  const conn = db ?? (await openDatabase());
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (patch.name !== undefined) {
    fields.push("name = ?", "transaction_name = ?");
    values.push(patch.name, patch.name);
  }
  if (patch.amount !== undefined) {
    fields.push("amount = ?");
    values.push(patch.amount);
  }
  if (patch.category !== undefined) {
    fields.push("category = ?");
    values.push(patch.category);
  }
  if (patch.category_source !== undefined) {
    fields.push("category_source = ?");
    values.push(patch.category_source);
  }
  if (patch.date !== undefined) {
    fields.push("transaction_date = ?");
    values.push(patch.date);
  }
  if (patch.merchant_name !== undefined) {
    fields.push("merchant_name = ?");
    values.push(patch.merchant_name);
  }
  if (patch.pending !== undefined) {
    fields.push("pending = ?");
    values.push(patch.pending ? 1 : 0);
  }
  if (patch.iso_currency_code !== undefined) {
    fields.push("iso_currency_code = ?");
    values.push(patch.iso_currency_code);
  }
  if (patch.updated_at !== undefined) {
    fields.push("updated_at = ?");
    values.push(patch.updated_at);
  }

  if (fields.length === 0) {
    return getTransactionById(id, conn);
  }

  values.push(id);
  await conn.runAsync(
    `UPDATE transactions SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  safeLogger.debug("Transaction row updated", { rowCount: 1 });
  return getTransactionById(id, conn);
}

/** Persists a user-chosen category; marked manual so Plaid sync won't overwrite it. */
export async function setTransactionCategoryManual(
  id: string,
  category: string,
  db?: SQLite.SQLiteDatabase,
): Promise<Transaction | null> {
  return updateTransaction(
    id,
    {
      category,
      category_source: "manual",
      updated_at: isoNow(),
    },
    db,
  );
}

export async function deleteTransaction(
  id: string,
  db?: SQLite.SQLiteDatabase,
): Promise<boolean> {
  const conn = db ?? (await openDatabase());
  const result = await conn.runAsync("DELETE FROM transactions WHERE id = ?", [
    id,
  ]);
  safeLogger.debug("Transaction row deleted", { changes: result.changes });
  return result.changes > 0;
}
