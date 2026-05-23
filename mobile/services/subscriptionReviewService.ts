import {
  deleteSubscription,
  getSubscriptionById,
  updateSubscription,
} from "../db/repositories/subscriptionsRepository";
import {
  saveConfirmedMerchantDecision,
  saveIgnoredMerchantDecision,
  saveRejectedSubscriptionPattern,
} from "../db/repositories/subscriptionDecisionsRepository";
import type { Subscription } from "../db/models/subscription";
import type { Transaction } from "../db/models/transaction";
import { normalizeMerchantKey } from "./subscriptionDetection";

async function requireSubscription(subscriptionId: string): Promise<Subscription> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error("Subscription not found");
  }
  return subscription;
}

/** Marks subscription as user-confirmed and keeps it across future detection runs. */
export async function confirmSubscription(subscriptionId: string): Promise<void> {
  const subscription = await requireSubscription(subscriptionId);

  await saveConfirmedMerchantDecision(
    subscription.merchant_name,
    subscription.display_name,
  );
  await updateSubscription(subscriptionId, { source: "manual" });
}

/** Hides this detected pattern only; the merchant can still be detected with other amounts/cadences. */
export async function rejectSubscription(subscriptionId: string): Promise<void> {
  const subscription = await requireSubscription(subscriptionId);

  await saveRejectedSubscriptionPattern(
    subscription.merchant_name,
    subscription.estimated_amount,
    subscription.cadence,
    subscription.display_name,
  );
  await deleteSubscription(subscriptionId);
}

/** Hides this merchant from subscriptions now and on future detection. */
export async function ignoreSubscriptionMerchant(subscriptionId: string): Promise<void> {
  const subscription = await requireSubscription(subscriptionId);

  await saveIgnoredMerchantDecision(
    subscription.merchant_name,
    subscription.display_name,
  );
  await deleteSubscription(subscriptionId);
}

/** Outflow transactions that match a subscription's merchant key. */
export function listTransactionsMatchingSubscription(
  subscription: Subscription,
  transactions: Transaction[],
  limit = 12,
): Transaction[] {
  const merchantKey = subscription.merchant_name;

  return transactions
    .filter(
      (transaction) =>
        transaction.amount > 0 && normalizeMerchantKey(transaction) === merchantKey,
    )
    .sort((left, right) => {
      const dateCompare = right.date.localeCompare(left.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return right.created_at.localeCompare(left.created_at);
    })
    .slice(0, limit);
}

export function formatSubscriptionConfidenceLabel(
  subscription: Subscription,
): string {
  if (subscription.source === "manual") {
    return "Confirmed by you";
  }

  switch (subscription.confidence) {
    case "high":
      return "High confidence · Detected from recurring charges";
    case "medium":
      return "Medium confidence · Detected from recurring charges";
    case "low":
      return "Low confidence · Detected from recurring charges";
    default:
      return "Detected from recurring charges";
  }
}
