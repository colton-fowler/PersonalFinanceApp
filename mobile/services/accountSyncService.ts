import { upsertAccountByPlaidId } from "../db/repositories/accountsRepository";
import { safeLogger } from "../security/safeLogger";
import { getPlaidAccessToken } from "./plaidTokenStore";
import { fetchAccountsBalances, PlaidApiError } from "./plaidApi";

export class AccountSyncError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AccountSyncError";
    this.status = status;
  }
}

/**
 * Fetches accounts/balances from the proxy and upserts local SQLite rows.
 * Never log balances, account IDs, or institution names.
 */
export async function syncAccountsFromPlaid(): Promise<number> {
  const accessToken = await getPlaidAccessToken();
  if (!accessToken) {
    throw new AccountSyncError("No bank connection on this device.");
  }

  try {
    const payload = await fetchAccountsBalances({ accessToken });

    for (const account of payload.accounts) {
      await upsertAccountByPlaidId({
        plaid_account_id: account.account_id,
        institution_name: payload.institution_name,
        account_name: account.official_name ?? account.name,
        account_type: account.type,
        subtype: account.subtype,
        current_balance: account.current_balance ?? 0,
        available_balance:
          account.available_balance ?? account.current_balance ?? 0,
        last_updated: payload.last_updated,
      });
    }

    return payload.accounts.length;
  } catch (error) {
    if (error instanceof PlaidApiError) {
      throw new AccountSyncError("Unable to refresh accounts.", error.status);
    }
    throw new AccountSyncError("Unable to refresh accounts.");
  }
}
