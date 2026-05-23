import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  type Transaction,
} from "plaid";
import type { AppConfig } from "../config.js";

/**
 * Stateless Plaid SDK client.
 * access_token is passed per request only — never stored or logged on this server.
 */

export function createPlaidClient(config: AppConfig): PlaidApi {
  const plaidEnv = PlaidEnvironments[config.PLAID_ENV];
  const configuration = new Configuration({
    basePath: plaidEnv,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": config.PLAID_CLIENT_ID,
        "PLAID-SECRET": config.PLAID_SECRET,
      },
    },
  });
  return new PlaidApi(configuration);
}

export async function createLinkToken(
  client: PlaidApi,
  clientUserId: string,
): Promise<{ link_token: string; expiration: string }> {
  const response = await client.linkTokenCreate({
    user: { client_user_id: clientUserId },
    client_name: "RMoney",
    products: [Products.Transactions, Products.Balance],
    country_codes: [CountryCode.Us],
    language: "en",
  });
  return {
    link_token: response.data.link_token,
    expiration: response.data.expiration,
  };
}

export async function exchangePublicToken(
  client: PlaidApi,
  publicToken: string,
): Promise<{ access_token: string; item_id: string }> {
  const response = await client.itemPublicTokenExchange({
    public_token: publicToken,
  });
  // Returned to mobile once — server does not persist access_token.
  return {
    access_token: response.data.access_token,
    item_id: response.data.item_id,
  };
}

const TRANSACTION_LOOKBACK_DAYS = 30;

export type NormalizedPlaidTransaction = {
  plaid_transaction_id: string;
  plaid_account_id: string;
  name: string;
  merchant_name: string | null;
  amount: number;
  date: string;
  category: string;
  pending: boolean;
  iso_currency_code: string | null;
};

export type TransactionsSyncResult = {
  transactions: NormalizedPlaidTransaction[];
  start_date: string;
  end_date: string;
  last_updated: string;
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizePlaidCategory(value: string | null | undefined): string {
  if (!value) {
    return "Other";
  }
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeTransaction(transaction: Transaction): NormalizedPlaidTransaction {
  const category =
    transaction.personal_finance_category?.primary ??
    transaction.category?.[0] ??
    "Other";

  return {
    plaid_transaction_id: transaction.transaction_id,
    plaid_account_id: transaction.account_id,
    name: transaction.name,
    merchant_name: transaction.merchant_name ?? null,
    amount: transaction.amount,
    date: transaction.date,
    category: normalizePlaidCategory(category),
    pending: transaction.pending ?? false,
    iso_currency_code: transaction.iso_currency_code,
  };
}

export async function fetchRecentTransactions(
  client: PlaidApi,
  accessToken: string,
  lookbackDays = TRANSACTION_LOOKBACK_DAYS,
): Promise<TransactionsSyncResult> {
  const endDate = toIsoDate(new Date());
  const start = new Date();
  start.setDate(start.getDate() - lookbackDays);
  const startDate = toIsoDate(start);

  const collected: NormalizedPlaidTransaction[] = [];
  let offset = 0;
  let totalTransactions = 0;

  do {
    const response = await client.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { offset, count: 500 },
    });

    totalTransactions = response.data.total_transactions;
    for (const transaction of response.data.transactions) {
      collected.push(normalizeTransaction(transaction));
    }
    offset += response.data.transactions.length;
  } while (offset < totalTransactions);

  return {
    transactions: collected,
    start_date: startDate,
    end_date: endDate,
    last_updated: new Date().toISOString(),
  };
}

export type PlaidAccountBalanceDto = {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  current_balance: number | null;
  available_balance: number | null;
};

export type AccountsBalancesResult = {
  institution_name: string;
  accounts: PlaidAccountBalanceDto[];
  last_updated: string;
};

export async function fetchAccountsAndBalances(
  client: PlaidApi,
  accessToken: string,
): Promise<AccountsBalancesResult> {
  const accountsResponse = await client.accountsGet({
    access_token: accessToken,
  });

  let balanceByAccountId = new Map(
    accountsResponse.data.accounts.map((account) => [
      account.account_id,
      account.balances,
    ]),
  );

  try {
    const balancesResponse = await client.accountsBalanceGet({
      access_token: accessToken,
    });
    balanceByAccountId = new Map(
      balancesResponse.data.accounts.map((account) => [
        account.account_id,
        account.balances,
      ]),
    );
  } catch {
    // Items linked before Balance was enabled may not support balance refresh.
  }

  const institutionId = accountsResponse.data.item.institution_id;
  let institutionName = "Linked bank";
  if (institutionId) {
    const institutionResponse = await client.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
    });
    institutionName = institutionResponse.data.institution.name;
  }

  const accounts: PlaidAccountBalanceDto[] =
    accountsResponse.data.accounts.map((account) => {
      const balances =
        balanceByAccountId.get(account.account_id) ?? account.balances;
      return {
        account_id: account.account_id,
        name: account.name,
        official_name: account.official_name ?? null,
        type: String(account.type),
        subtype: account.subtype ? String(account.subtype) : null,
        current_balance: balances?.current ?? null,
        available_balance: balances?.available ?? null,
      };
    });

  return {
    institution_name: institutionName,
    accounts,
    last_updated: new Date().toISOString(),
  };
}
