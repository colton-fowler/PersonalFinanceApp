export type TransactionCategory =
  | "Food"
  | "Transportation"
  | "Shopping"
  | "Housing"
  | "Entertainment"
  | "Utilities"
  | "Income"
  | "Other";

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  "Food",
  "Transportation",
  "Shopping",
  "Housing",
  "Entertainment",
  "Utilities",
  "Income",
  "Other",
];

export function isTransactionCategory(value: string): value is TransactionCategory {
  return (TRANSACTION_CATEGORIES as string[]).includes(value);
}
