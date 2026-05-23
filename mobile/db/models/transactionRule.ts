/** User-defined merchant → category rule (device-local). */
export type TransactionRule = {
  id: string;
  merchant_key: string;
  merchant_name: string | null;
  category: string;
  created_at: string;
  updated_at: string | null;
};

export type TransactionRuleInsert = {
  id?: string;
  merchant_key: string;
  merchant_name?: string | null;
  category: string;
  created_at?: string;
  updated_at?: string | null;
};

export type TransactionRuleRow = {
  id: string;
  merchant_key: string;
  merchant_name: string | null;
  category: string;
  created_at: string;
  updated_at: string | null;
};

export function transactionRuleFromRow(row: TransactionRuleRow): TransactionRule {
  return {
    id: row.id,
    merchant_key: row.merchant_key,
    merchant_name: row.merchant_name,
    category: row.category,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
