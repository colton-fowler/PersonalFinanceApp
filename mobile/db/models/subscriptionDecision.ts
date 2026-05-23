import type { SubscriptionCadence } from "./subscription";

/** User review outcome for a detected recurring merchant. */
export type SubscriptionDecisionType =
  | "confirmed"
  | "not_subscription"
  | "ignored_merchant";

export type SubscriptionDecision = {
  id: string;
  merchant_key: string;
  decision: SubscriptionDecisionType;
  display_name: string | null;
  /** Set for not_subscription — amount signature of the rejected pattern. */
  normalized_amount: number | null;
  /** Set for not_subscription — cadence signature of the rejected pattern. */
  cadence: SubscriptionCadence | null;
  created_at: string;
  updated_at: string | null;
};

export type SubscriptionDecisionRow = {
  id: string;
  merchant_key: string;
  decision: string;
  display_name: string | null;
  normalized_amount: number | null;
  cadence: string | null;
  created_at: string;
  updated_at: string | null;
};

export function subscriptionDecisionFromRow(
  row: SubscriptionDecisionRow,
): SubscriptionDecision {
  const cadence = row.cadence;
  return {
    id: row.id,
    merchant_key: row.merchant_key,
    decision: row.decision as SubscriptionDecisionType,
    display_name: row.display_name,
    normalized_amount: row.normalized_amount,
    cadence:
      cadence === "weekly" || cadence === "monthly" || cadence === "unknown"
        ? cadence
        : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
