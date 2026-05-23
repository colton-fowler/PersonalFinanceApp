import { listAllTransactions } from "../db/repositories/transactionsRepository";
import type { Transaction } from "../db/models/transaction";

export type CategorySpend = {
  category: string;
  amount: number;
  percentage: number;
};

export type MonthlySpendingSummary = {
  monthKey: string;
  monthLabel: string;
  totalSpent: number;
  topCategories: CategorySpend[];
};

const TOP_CATEGORY_LIMIT = 5;

const EXCLUDED_CATEGORY_KEYWORDS = [
  "income",
  "transfer",
  "payment",
  "loan payment",
  "credit card payment",
];

const EXCLUDED_LABEL_KEYWORDS = [
  "transfer",
  "credit card payment",
  "autopay payment",
  "payment to",
  "payment thank you",
];

function monthKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabelFromKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const labelDate = new Date(year, month - 1, 1);
  return labelDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Category label used when grouping monthly spending totals. */
export function spendingCategoryLabel(transaction: Transaction): string {
  return transaction.category.trim() || "Other";
}

export function isTransactionInSpendingMonth(
  transaction: Transaction,
  monthKey: string,
): boolean {
  return transaction.date.startsWith(monthKey);
}

/** Plaid outflows are positive; credits/income are zero or negative. */
export function isSpendingOutflow(transaction: Transaction): boolean {
  if (transaction.pending) {
    return false;
  }

  if (transaction.amount <= 0) {
    return false;
  }

  const category = transaction.category.toLowerCase();
  if (EXCLUDED_CATEGORY_KEYWORDS.some((keyword) => category.includes(keyword))) {
    return false;
  }

  const label = (transaction.merchant_name ?? transaction.name).toLowerCase();
  if (EXCLUDED_LABEL_KEYWORDS.some((keyword) => label.includes(keyword))) {
    return false;
  }

  return true;
}

/** Transactions included in a monthly spending category total (same filters as summarize). */
export function listMonthlySpendingTransactionsForCategory(
  transactions: Transaction[],
  category: string,
  monthKey: string,
): Transaction[] {
  return transactions
    .filter((transaction) => isTransactionInSpendingMonth(transaction, monthKey))
    .filter(isSpendingOutflow)
    .filter((transaction) => spendingCategoryLabel(transaction) === category)
    .sort((left, right) => {
      const dateCompare = right.date.localeCompare(left.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return right.created_at.localeCompare(left.created_at);
    });
}

export function sumSpendingTransactionAmounts(transactions: Transaction[]): number {
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Groups current-month spending outflows by category.
 * Excludes income, pending charges, and transfer/payment-like rows.
 */
export function summarizeMonthlySpending(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): MonthlySpendingSummary {
  const monthKey = monthKeyFromDate(referenceDate);
  const totalsByCategory = new Map<string, number>();

  for (const transaction of transactions) {
    if (!isTransactionInSpendingMonth(transaction, monthKey)) {
      continue;
    }

    if (!isSpendingOutflow(transaction)) {
      continue;
    }

    const category = spendingCategoryLabel(transaction);
    totalsByCategory.set(
      category,
      (totalsByCategory.get(category) ?? 0) + transaction.amount,
    );
  }

  const totalSpent = [...totalsByCategory.values()].reduce(
    (sum, amount) => sum + amount,
    0,
  );

  const topCategories = [...totalsByCategory.entries()]
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 1000) / 10 : 0,
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, TOP_CATEGORY_LIMIT);

  return {
    monthKey,
    monthLabel: monthLabelFromKey(monthKey),
    totalSpent: Math.round(totalSpent * 100) / 100,
    topCategories,
  };
}

/** Recomputes monthly spending from locally stored transactions. */
export async function computeMonthlySpendingSummary(
  referenceDate: Date = new Date(),
): Promise<MonthlySpendingSummary> {
  const transactions = await listAllTransactions();
  return summarizeMonthlySpending(transactions, referenceDate);
}
