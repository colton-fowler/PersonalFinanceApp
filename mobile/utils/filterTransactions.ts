import type { Transaction } from "../db/models/transaction";

export type TransactionListRow = Transaction & {
  accountLabel: string;
};

/** Normalize search text once; pair with useMemo in callers. */
export function normalizeTransactionSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** In-memory filter for recent transaction lists (merchant, name, category, account). */
export function filterTransactionRows<T extends TransactionListRow>(
  rows: T[],
  normalizedQuery: string,
): T[] {
  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) => {
    const haystack = [
      row.merchant_name,
      row.name,
      row.category,
      row.accountLabel,
    ]
      .filter((part): part is string => Boolean(part))
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
