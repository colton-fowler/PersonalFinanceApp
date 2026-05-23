import { getAccountByPlaidAccountId } from "../db/repositories/accountsRepository";
import { upsertTransactionByPlaidId } from "../db/repositories/transactionsRepository";
import { safeLogger } from "../security/safeLogger";
import { fetchTransactionsSync, PlaidApiError } from "./plaidApi";
import { getPlaidAccessToken } from "./plaidTokenStore";

export class TransactionSyncError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TransactionSyncError";
    this.status = status;
  }
}

/**
 * Fetches recent Plaid transactions and upserts local SQLite rows.
 * Never log transaction names, amounts, or merchants.
 */
export async function syncTransactionsFromPlaid(): Promise<number> {
  const accessToken = await getPlaidAccessToken();
  if (!accessToken) {
    throw new TransactionSyncError("No bank connection on this device.");
  }

  try {
    const payload = await fetchTransactionsSync({ accessToken });
    let syncedCount = 0;

    for (const transaction of payload.transactions) {
      const account = await getAccountByPlaidAccountId(
        transaction.plaid_account_id,
      );
      if (!account) {
        continue;
      }

      await upsertTransactionByPlaidId({
        plaid_transaction_id: transaction.plaid_transaction_id,
        account_id: account.id,
        name: transaction.name,
        merchant_name: transaction.merchant_name,
        amount: transaction.amount,
        date: transaction.date,
        category: transaction.category,
        pending: transaction.pending,
        iso_currency_code: transaction.iso_currency_code,
        updated_at: payload.last_updated,
      });
      syncedCount += 1;
    }

    return syncedCount;
  } catch (error) {
    if (error instanceof PlaidApiError) {
      throw new TransactionSyncError(
        "Unable to refresh transactions.",
        error.status,
      );
    }
    throw new TransactionSyncError("Unable to refresh transactions.");
  }
}
