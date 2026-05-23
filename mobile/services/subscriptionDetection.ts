import type { Transaction } from "../db/models/transaction";
import type {
  SubscriptionCadence,
  SubscriptionConfidence,
  SubscriptionInsert,
} from "../db/models/subscription";

const MIN_TRANSACTIONS = 2;
const AMOUNT_TOLERANCE_RATIO = 0.1;
const AMOUNT_TOLERANCE_MIN = 1;
const WEEKLY_MIN_DAYS = 5;
const WEEKLY_MAX_DAYS = 10;
const MONTHLY_MIN_DAYS = 25;
const MONTHLY_MAX_DAYS = 35;

type MerchantGroup = {
  merchantKey: string;
  displayName: string;
  transactions: Transaction[];
};

export function normalizeMerchantKey(transaction: Transaction): string {
  return (transaction.merchant_name ?? transaction.name).trim().toLowerCase();
}

export function displayNameForMerchant(transaction: Transaction): string {
  const raw = (transaction.merchant_name ?? transaction.name).trim();
  return raw.length > 0 ? raw : "Unknown merchant";
}

function amountsAreSimilar(left: number, right: number): boolean {
  const tolerance = Math.max(
    AMOUNT_TOLERANCE_MIN,
    Math.max(Math.abs(left), Math.abs(right)) * AMOUNT_TOLERANCE_RATIO,
  );
  return Math.abs(left - right) <= tolerance;
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function filterSimilarAmountTransactions(
  transactions: Transaction[],
): Transaction[] {
  if (transactions.length < MIN_TRANSACTIONS) {
    return [];
  }

  const sortedByAmount = [...transactions].sort((a, b) => a.amount - b.amount);
  const median = sortedByAmount[Math.floor(sortedByAmount.length / 2)].amount;

  return transactions.filter((transaction) =>
    amountsAreSimilar(transaction.amount, median),
  );
}

function detectCadence(
  sortedDates: string[],
): { cadence: SubscriptionCadence; confidence: SubscriptionConfidence } {
  if (sortedDates.length < MIN_TRANSACTIONS) {
    return { cadence: "unknown", confidence: "low" };
  }

  const intervals: number[] = [];
  for (let index = 1; index < sortedDates.length; index += 1) {
    intervals.push(daysBetween(sortedDates[index - 1], sortedDates[index]));
  }

  const weeklyMatches = intervals.filter(
    (days) => days >= WEEKLY_MIN_DAYS && days <= WEEKLY_MAX_DAYS,
  ).length;
  const monthlyMatches = intervals.filter(
    (days) => days >= MONTHLY_MIN_DAYS && days <= MONTHLY_MAX_DAYS,
  ).length;
  const intervalCount = intervals.length;
  const avgInterval = average(intervals);

  if (
    weeklyMatches / intervalCount >= 0.67 &&
    avgInterval >= WEEKLY_MIN_DAYS &&
    avgInterval <= WEEKLY_MAX_DAYS
  ) {
    return {
      cadence: "weekly",
      confidence: sortedDates.length >= 3 ? "high" : "medium",
    };
  }

  if (
    monthlyMatches / intervalCount >= 0.67 &&
    avgInterval >= MONTHLY_MIN_DAYS &&
    avgInterval <= MONTHLY_MAX_DAYS
  ) {
    return {
      cadence: "monthly",
      confidence: sortedDates.length >= 3 ? "high" : "medium",
    };
  }

  if (intervalCount === 1) {
    const [onlyInterval] = intervals;
    if (onlyInterval >= WEEKLY_MIN_DAYS && onlyInterval <= WEEKLY_MAX_DAYS) {
      return { cadence: "weekly", confidence: "medium" };
    }
    if (onlyInterval >= MONTHLY_MIN_DAYS && onlyInterval <= MONTHLY_MAX_DAYS) {
      return { cadence: "monthly", confidence: "medium" };
    }
  }

  return { cadence: "unknown", confidence: "low" };
}

function addCadenceToDate(date: string, cadence: SubscriptionCadence): string {
  const next = new Date(`${date}T12:00:00`);
  if (cadence === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (cadence === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + 30);
  }
  return next.toISOString().slice(0, 10);
}

function buildDetectedSubscription(group: MerchantGroup): SubscriptionInsert | null {
  const outflows = group.transactions.filter((transaction) => transaction.amount > 0);
  const matching = filterSimilarAmountTransactions(outflows);

  if (matching.length < MIN_TRANSACTIONS) {
    return null;
  }

  const sorted = [...matching].sort((a, b) => a.date.localeCompare(b.date));
  const sortedDates = sorted.map((transaction) => transaction.date);
  const { cadence, confidence } = detectCadence(sortedDates);

  if (cadence === "unknown" && confidence === "low") {
    return null;
  }

  const estimatedAmount = average(sorted.map((transaction) => transaction.amount));
  const lastChargeDate = sortedDates[sortedDates.length - 1];

  return {
    merchant_name: group.merchantKey,
    display_name: group.displayName,
    estimated_amount: Math.round(estimatedAmount * 100) / 100,
    cadence,
    last_charge_date: lastChargeDate,
    next_estimated_charge_date: addCadenceToDate(lastChargeDate, cadence),
    confidence,
    source: "detected",
  };
}

/**
 * Groups outflow transactions by merchant, then flags recurring patterns.
 * Requires at least 2 similar-amount charges on a weekly or monthly cadence.
 */
export function detectSubscriptionsFromTransactions(
  transactions: Transaction[],
): SubscriptionInsert[] {
  const groups = new Map<string, MerchantGroup>();

  for (const transaction of transactions) {
    if (transaction.amount <= 0) {
      continue;
    }

    const merchantKey = normalizeMerchantKey(transaction);
    if (merchantKey.length === 0) {
      continue;
    }

    const existing = groups.get(merchantKey);
    if (existing) {
      existing.transactions.push(transaction);
      continue;
    }

    groups.set(merchantKey, {
      merchantKey,
      displayName: displayNameForMerchant(transaction),
      transactions: [transaction],
    });
  }

  const detected: SubscriptionInsert[] = [];
  for (const group of groups.values()) {
    const subscription = buildDetectedSubscription(group);
    if (subscription) {
      detected.push(subscription);
    }
  }

  return detected.sort((a, b) =>
    a.next_estimated_charge_date.localeCompare(b.next_estimated_charge_date),
  );
}
