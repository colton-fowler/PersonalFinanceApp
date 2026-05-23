import { formatCurrency } from "./formatCurrency";

/** Plaid uses positive amounts for outflows (expenses). */
export function formatTransactionAmount(amount: number): {
  text: string;
  isOutflow: boolean;
} {
  if (amount > 0) {
    return { text: formatCurrency(-amount), isOutflow: true };
  }
  return { text: formatCurrency(Math.abs(amount)), isOutflow: false };
}

export function formatTransactionDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
