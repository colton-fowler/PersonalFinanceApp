import type * as SQLite from "expo-sqlite";
import { openDatabase } from "../connection";
import {
  accountFromRow,
  type Account,
  type AccountInsert,
  type AccountRow,
  type AccountUpdate,
} from "../models/account";
import { createId, isoNow } from "../utils/id";
import { safeLogger } from "../../security/safeLogger";

export async function createAccount(
  input: AccountInsert,
  db?: SQLite.SQLiteDatabase,
): Promise<Account> {
  const conn = db ?? (await openDatabase());
  const id = input.id ?? createId();
  const createdAt = input.created_at ?? isoNow();

  await conn.runAsync(
    `INSERT INTO accounts (
       id, plaid_account_id, institution_name, account_name, account_type,
       subtype, current_balance, available_balance, last_updated, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.plaid_account_id ?? null,
      input.institution_name,
      input.account_name,
      input.account_type,
      input.subtype ?? null,
      input.current_balance,
      input.available_balance,
      input.last_updated ?? isoNow(),
      createdAt,
    ],
  );

  safeLogger.debug("Account row inserted", { rowCount: 1 });
  const row = await getAccountById(id, conn);
  if (!row) {
    throw new Error("Account insert failed");
  }
  return row;
}

export async function upsertAccountByPlaidId(
  input: AccountInsert & { plaid_account_id: string },
  db?: SQLite.SQLiteDatabase,
): Promise<Account> {
  const conn = db ?? (await openDatabase());
  const existing = await conn.getFirstAsync<AccountRow>(
    "SELECT * FROM accounts WHERE plaid_account_id = ?",
    [input.plaid_account_id],
  );

  if (existing) {
    const updated = await updateAccount(
      existing.id,
      {
        institution_name: input.institution_name,
        account_name: input.account_name,
        account_type: input.account_type,
        subtype: input.subtype ?? null,
        current_balance: input.current_balance,
        available_balance: input.available_balance,
        last_updated: input.last_updated ?? isoNow(),
      },
      conn,
    );
    if (!updated) {
      throw new Error("Account update failed");
    }
    return updated;
  }

  return createAccount(input, conn);
}

export async function getAccountByPlaidAccountId(
  plaidAccountId: string,
  db?: SQLite.SQLiteDatabase,
): Promise<Account | null> {
  const conn = db ?? (await openDatabase());
  const row = await conn.getFirstAsync<AccountRow>(
    "SELECT * FROM accounts WHERE plaid_account_id = ?",
    [plaidAccountId],
  );
  return row ? accountFromRow(row) : null;
}

export async function getAccountById(
  id: string,
  db?: SQLite.SQLiteDatabase,
): Promise<Account | null> {
  const conn = db ?? (await openDatabase());
  const row = await conn.getFirstAsync<AccountRow>(
    "SELECT * FROM accounts WHERE id = ?",
    [id],
  );
  return row ? accountFromRow(row) : null;
}

export async function listAccounts(
  db?: SQLite.SQLiteDatabase,
): Promise<Account[]> {
  const conn = db ?? (await openDatabase());
  const rows = await conn.getAllAsync<AccountRow>(
    "SELECT * FROM accounts ORDER BY account_type ASC, subtype ASC, account_name ASC",
  );
  safeLogger.debug("Accounts listed", { count: rows.length });
  return rows.map(accountFromRow);
}

export async function updateAccount(
  id: string,
  patch: AccountUpdate,
  db?: SQLite.SQLiteDatabase,
): Promise<Account | null> {
  const conn = db ?? (await openDatabase());
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (patch.plaid_account_id !== undefined) {
    fields.push("plaid_account_id = ?");
    values.push(patch.plaid_account_id);
  }
  if (patch.institution_name !== undefined) {
    fields.push("institution_name = ?");
    values.push(patch.institution_name);
  }
  if (patch.account_name !== undefined) {
    fields.push("account_name = ?");
    values.push(patch.account_name);
  }
  if (patch.account_type !== undefined) {
    fields.push("account_type = ?");
    values.push(patch.account_type);
  }
  if (patch.subtype !== undefined) {
    fields.push("subtype = ?");
    values.push(patch.subtype);
  }
  if (patch.current_balance !== undefined) {
    fields.push("current_balance = ?");
    values.push(patch.current_balance);
  }
  if (patch.available_balance !== undefined) {
    fields.push("available_balance = ?");
    values.push(patch.available_balance);
  }
  if (patch.last_updated !== undefined) {
    fields.push("last_updated = ?");
    values.push(patch.last_updated);
  }

  if (fields.length === 0) {
    return getAccountById(id, conn);
  }

  values.push(id);
  await conn.runAsync(
    `UPDATE accounts SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  safeLogger.debug("Account row updated", { rowCount: 1 });
  return getAccountById(id, conn);
}

export async function deleteAccount(
  id: string,
  db?: SQLite.SQLiteDatabase,
): Promise<boolean> {
  const conn = db ?? (await openDatabase());
  const result = await conn.runAsync("DELETE FROM accounts WHERE id = ?", [id]);
  safeLogger.debug("Account row deleted", { changes: result.changes });
  return result.changes > 0;
}
