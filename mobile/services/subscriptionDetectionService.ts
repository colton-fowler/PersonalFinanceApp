import { replaceDetectedSubscriptions } from "../db/repositories/subscriptionsRepository";
import { listAllTransactions } from "../db/repositories/transactionsRepository";
import { detectSubscriptionsFromTransactions } from "./subscriptionDetection";

/**
 * Re-runs local subscription detection from stored transactions.
 * Replaces prior detected rows; manual subscriptions are preserved.
 */
export async function detectAndStoreSubscriptions(): Promise<number> {
  const transactions = await listAllTransactions();
  const detected = detectSubscriptionsFromTransactions(transactions);
  return replaceDetectedSubscriptions(detected);
}
