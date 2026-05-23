import type { SubscriptionCadence } from "../db/models/subscription";

/** Rounds subscription amounts for stable pattern matching. */
export function normalizeSubscriptionAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export type RejectedSubscriptionPattern = {
  merchant_key: string;
  normalized_amount: number;
  cadence: SubscriptionCadence;
};

export function subscriptionPatternFromValues(
  merchantKey: string,
  estimatedAmount: number,
  cadence: SubscriptionCadence,
): RejectedSubscriptionPattern {
  return {
    merchant_key: merchantKey,
    normalized_amount: normalizeSubscriptionAmount(estimatedAmount),
    cadence,
  };
}

export function subscriptionMatchesRejectedPattern(
  subscription: {
    merchant_name: string;
    estimated_amount: number;
    cadence: SubscriptionCadence;
  },
  patterns: RejectedSubscriptionPattern[],
): boolean {
  const amount = normalizeSubscriptionAmount(subscription.estimated_amount);
  return patterns.some(
    (pattern) =>
      pattern.merchant_key === subscription.merchant_name &&
      pattern.normalized_amount === amount &&
      pattern.cadence === subscription.cadence,
  );
}

export function isSubscriptionHiddenFromDashboard(
  subscription: {
    merchant_name: string;
    estimated_amount: number;
    cadence: SubscriptionCadence;
  },
  ignoredMerchantKeys: Set<string>,
  rejectedPatterns: RejectedSubscriptionPattern[],
): boolean {
  if (ignoredMerchantKeys.has(subscription.merchant_name)) {
    return true;
  }
  return subscriptionMatchesRejectedPattern(subscription, rejectedPatterns);
}
