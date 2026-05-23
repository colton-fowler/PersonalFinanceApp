/** Local account row — balances and plaid_account_id are sensitive; never log field values. */
export type Account = {
  id: string;
  plaid_account_id: string | null;
  institution_name: string;
  account_name: string;
  account_type: string;
  subtype: string | null;
  current_balance: number;
  available_balance: number;
  last_updated: string | null;
  created_at: string;
};

export type AccountInsert = {
  id?: string;
  plaid_account_id?: string | null;
  institution_name: string;
  account_name: string;
  account_type: string;
  subtype?: string | null;
  current_balance: number;
  available_balance: number;
  last_updated?: string | null;
  created_at?: string;
};

export type AccountUpdate = Partial<
  Pick<
    Account,
    | "plaid_account_id"
    | "institution_name"
    | "account_name"
    | "account_type"
    | "subtype"
    | "current_balance"
    | "available_balance"
    | "last_updated"
  >
>;

export type AccountRow = {
  id: string;
  plaid_account_id: string | null;
  institution_name: string;
  account_name: string;
  account_type: string;
  subtype: string | null;
  current_balance: number;
  available_balance: number;
  last_updated: string | null;
  created_at: string;
};

export function accountFromRow(row: AccountRow): Account {
  return {
    id: row.id,
    plaid_account_id: row.plaid_account_id,
    institution_name: row.institution_name,
    account_name: row.account_name,
    account_type: row.account_type,
    subtype: row.subtype,
    current_balance: row.current_balance,
    available_balance: row.available_balance,
    last_updated: row.last_updated,
    created_at: row.created_at,
  };
}
