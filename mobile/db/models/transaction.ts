/** Local transaction row — names, amounts, merchants are sensitive. */
export type Transaction = {
  id: string;
  plaid_transaction_id: string | null;
  account_id: string;
  name: string;
  merchant_name: string | null;
  amount: number;
  /** Stored in SQLite as transaction_date (YYYY-MM-DD). */
  date: string;
  category: string;
  pending: boolean;
  iso_currency_code: string | null;
  created_at: string;
  updated_at: string | null;
};

export type TransactionInsert = {
  id?: string;
  plaid_transaction_id?: string | null;
  account_id: string;
  name: string;
  merchant_name?: string | null;
  amount: number;
  date: string;
  category: string;
  pending?: boolean;
  iso_currency_code?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type TransactionUpdate = Partial<
  Pick<
    Transaction,
    | "name"
    | "merchant_name"
    | "amount"
    | "date"
    | "category"
    | "pending"
    | "iso_currency_code"
    | "updated_at"
  >
>;

export type TransactionRow = {
  id: string;
  plaid_transaction_id: string | null;
  account_id: string;
  transaction_name: string;
  name: string;
  amount: number;
  category: string;
  transaction_date: string;
  merchant_name: string | null;
  recurring: number;
  pending: number;
  iso_currency_code: string | null;
  created_at: string;
  updated_at: string | null;
};

export function transactionFromRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    plaid_transaction_id: row.plaid_transaction_id,
    account_id: row.account_id,
    name: row.name || row.transaction_name,
    merchant_name: row.merchant_name,
    amount: row.amount,
    date: row.transaction_date,
    category: row.category,
    pending: row.pending === 1,
    iso_currency_code: row.iso_currency_code,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
