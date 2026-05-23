/** Categories the user can pick when editing a transaction. */
export const USER_SELECTABLE_CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Shopping",
  "Entertainment",
  "Transport",
  "Bills",
  "Subscriptions",
  "Health",
  "Income",
  "Transfer",
  "Other",
] as const;

export type UserSelectableCategory = (typeof USER_SELECTABLE_CATEGORIES)[number];

export function isUserSelectableCategory(value: string): value is UserSelectableCategory {
  return (USER_SELECTABLE_CATEGORIES as readonly string[]).includes(value);
}

/** @deprecated Sample-data labels — prefer USER_SELECTABLE_CATEGORIES for UI. */
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
