export type SubscriptionCadence = "weekly" | "monthly" | "unknown";

export type SubscriptionConfidence = "low" | "medium" | "high";

export type SubscriptionSource = "detected" | "manual";

/** Recurring charge — merchant and amount are sensitive. */
export type Subscription = {
  id: string;
  merchant_name: string;
  display_name: string;
  estimated_amount: number;
  cadence: SubscriptionCadence;
  last_charge_date: string;
  next_estimated_charge_date: string;
  confidence: SubscriptionConfidence;
  source: SubscriptionSource;
};

export type SubscriptionInsert = {
  id?: string;
  merchant_name: string;
  display_name: string;
  estimated_amount: number;
  cadence: SubscriptionCadence;
  last_charge_date: string;
  next_estimated_charge_date: string;
  confidence: SubscriptionConfidence;
  source: SubscriptionSource;
};

export type SubscriptionUpdate = Partial<
  Pick<
    Subscription,
    | "merchant_name"
    | "display_name"
    | "estimated_amount"
    | "cadence"
    | "last_charge_date"
    | "next_estimated_charge_date"
    | "confidence"
    | "source"
  >
>;

export type SubscriptionRow = {
  id: string;
  merchant_name: string;
  display_name: string;
  amount: number;
  estimated_amount: number | null;
  next_charge_date: string;
  frequency: string;
  last_charge_date: string | null;
  confidence: string;
  source: string;
};

export function subscriptionFromRow(row: SubscriptionRow): Subscription {
  const cadence = normalizeCadence(row.frequency);
  const estimatedAmount = row.estimated_amount ?? row.amount;

  return {
    id: row.id,
    merchant_name: row.merchant_name,
    display_name: row.display_name || row.merchant_name,
    estimated_amount: estimatedAmount,
    cadence,
    last_charge_date: row.last_charge_date ?? row.next_charge_date,
    next_estimated_charge_date: row.next_charge_date,
    confidence: row.confidence as SubscriptionConfidence,
    source: row.source as SubscriptionSource,
  };
}

function normalizeCadence(value: string): SubscriptionCadence {
  if (value === "weekly" || value === "monthly") {
    return value;
  }
  return "unknown";
}
