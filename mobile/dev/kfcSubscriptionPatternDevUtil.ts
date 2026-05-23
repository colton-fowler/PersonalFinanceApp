/**
 * Dev-only helpers for KFC subscription pattern / ignore-decision testing.
 * Never import from production UI — all exports guard on __DEV__.
 *
 * Manual run (after app init in dev client):
 *   globalThis.runKfcIgnoreRemovalVerification?.()
 */
import { initializeDatabase } from "../db";
import { openDatabase } from "../db/connection";
import { createAccount } from "../db/repositories/accountsRepository";
import { listAccounts } from "../db/repositories/accountsRepository";
import {
  listRejectedSubscriptionPatterns,
  saveRejectedSubscriptionPattern,
} from "../db/repositories/subscriptionDecisionsRepository";
import {
  createSubscription,
  listDetectedSubscriptions,
  listVisibleSubscriptions,
} from "../db/repositories/subscriptionsRepository";
import { createTransaction, listAllTransactions } from "../db/repositories/transactionsRepository";
import { detectAndStoreSubscriptions } from "../services/subscriptionDetectionService";
import { normalizeSubscriptionAmount } from "../utils/subscriptionPattern";
import { createId } from "../db/utils/id";
import { safeLogger } from "../security/safeLogger";
import type { SubscriptionCadence } from "../db/models/subscription";

/** Detection stores merchant_name as normalizeMerchantKey("KFC") → "kfc". */
export const KFC_DEV_MERCHANT_KEY = "kfc";
const KFC_DEV_DISPLAY_NAME = "KFC";
const KFC_REJECTED_AMOUNT = 12;
const KFC_REJECTED_CADENCE: SubscriptionCadence = "monthly";

export type KfcPatternVisibility = {
  amount: number;
  cadence: SubscriptionCadence;
  visible: boolean;
};

export type KfcIgnoreRemovalVerificationResult = {
  ignoredDecisionRemoved: boolean;
  notSubscriptionPatternKept: boolean;
  detectedCount: number;
  visibleCount: number;
  patterns: KfcPatternVisibility[];
  passed: boolean;
};

function assertDevOnly(): void {
  if (!__DEV__) {
    throw new Error("KFC dev utilities are only available in development builds.");
  }
}

async function requireDevAccountId(): Promise<string> {
  const accounts = await listAccounts();
  if (accounts.length > 0) {
    return accounts[0]!.id;
  }

  const account = await createAccount({
    id: createId(),
    plaid_account_id: "dev_kfc_checking",
    institution_name: "Dev Bank",
    account_name: "Dev Checking",
    account_type: "depository",
    subtype: "checking",
    current_balance: 1000,
    available_balance: 1000,
  });
  return account.id;
}

function isKfcTransaction(merchantName: string | null, name: string): boolean {
  return (merchantName ?? name).trim().toLowerCase() === KFC_DEV_MERCHANT_KEY;
}

/** Inserts recurring KFC charges for $12 monthly, $18 monthly, and $12 weekly patterns. */
export async function seedKfcSubscriptionPatternTransactions(): Promise<number> {
  assertDevOnly();
  await initializeDatabase();

  const accountId = await requireDevAccountId();
  const existing = await listAllTransactions();
  const hasKfc = existing.some((tx) => isKfcTransaction(tx.merchant_name, tx.name));
  if (hasKfc) {
    safeLogger.info("KFC dev seed skipped — KFC transactions already present");
    return 0;
  }

  const specs = [
    { amount: 12, date: "2026-03-15" },
    { amount: 12, date: "2026-04-15" },
    { amount: 18, date: "2026-03-10" },
    { amount: 18, date: "2026-04-10" },
    { amount: 12, date: "2026-05-01" },
    { amount: 12, date: "2026-05-08" },
  ];

  for (const spec of specs) {
    await createTransaction({
      account_id: accountId,
      name: KFC_DEV_DISPLAY_NAME,
      merchant_name: KFC_DEV_DISPLAY_NAME,
      amount: spec.amount,
      category: "Food & Dining",
      date: spec.date,
    });
  }

  safeLogger.info("KFC dev transactions seeded", { count: specs.length });
  return specs.length;
}

/** Ensures not_subscription exists for KFC $12 monthly (idempotent). */
export async function ensureKfcNotSubscriptionPattern(): Promise<void> {
  assertDevOnly();
  await initializeDatabase();
  await saveRejectedSubscriptionPattern(
    KFC_DEV_MERCHANT_KEY,
    KFC_REJECTED_AMOUNT,
    KFC_REJECTED_CADENCE,
    KFC_DEV_DISPLAY_NAME,
  );
}

/** Removes ignored_merchant for KFC so pattern-level rejections still apply. */
export async function deleteKfcIgnoredMerchantDecision(): Promise<boolean> {
  assertDevOnly();
  await initializeDatabase();
  const db = await openDatabase();
  const result = await db.runAsync(
    `DELETE FROM subscription_decisions
     WHERE decision = 'ignored_merchant' AND merchant_key = ?`,
    [KFC_DEV_MERCHANT_KEY],
  );
  safeLogger.info("KFC ignored_merchant decision removed", { changes: result.changes });
  return result.changes > 0;
}

/**
 * Detection groups by merchant and yields one row; dev harness inserts three
 * detected patterns to exercise visibility filtering.
 */
async function upsertKfcDevDetectedPatternRows(): Promise<number> {
  assertDevOnly();
  const db = await openDatabase();
  await db.runAsync(
    `DELETE FROM subscriptions WHERE source = 'detected' AND merchant_name = ?`,
    [KFC_DEV_MERCHANT_KEY],
  );

  const patterns: Array<{
    amount: number;
    cadence: SubscriptionCadence;
    last_charge_date: string;
    next_estimated_charge_date: string;
  }> = [
    {
      amount: 12,
      cadence: "monthly",
      last_charge_date: "2026-04-15",
      next_estimated_charge_date: "2026-05-15",
    },
    {
      amount: 18,
      cadence: "monthly",
      last_charge_date: "2026-04-10",
      next_estimated_charge_date: "2026-05-10",
    },
    {
      amount: 12,
      cadence: "weekly",
      last_charge_date: "2026-05-08",
      next_estimated_charge_date: "2026-05-15",
    },
  ];

  for (const pattern of patterns) {
    await createSubscription(
      {
        merchant_name: KFC_DEV_MERCHANT_KEY,
        display_name: KFC_DEV_DISPLAY_NAME,
        estimated_amount: pattern.amount,
        cadence: pattern.cadence,
        last_charge_date: pattern.last_charge_date,
        next_estimated_charge_date: pattern.next_estimated_charge_date,
        confidence: "medium",
        source: "detected",
      },
      db,
    );
  }

  return patterns.length;
}

function patternKey(amount: number, cadence: SubscriptionCadence): string {
  return `${normalizeSubscriptionAmount(amount)}:${cadence}`;
}

/**
 * Deletes KFC ignored_merchant, keeps not_subscription $12/monthly, reruns
 * detection, and verifies visibility for each KFC pattern.
 */
export async function runKfcIgnoreRemovalVerification(): Promise<KfcIgnoreRemovalVerificationResult> {
  assertDevOnly();
  await initializeDatabase();

  await seedKfcSubscriptionPatternTransactions();
  await ensureKfcNotSubscriptionPattern();

  const ignoredDecisionRemoved = await deleteKfcIgnoredMerchantDecision();

  await detectAndStoreSubscriptions();
  await upsertKfcDevDetectedPatternRows();

  const rejectedPatterns = await listRejectedSubscriptionPatterns();
  const notSubscriptionPatternKept = rejectedPatterns.some(
    (pattern) =>
      pattern.merchant_key === KFC_DEV_MERCHANT_KEY &&
      pattern.normalized_amount === KFC_REJECTED_AMOUNT &&
      pattern.cadence === KFC_REJECTED_CADENCE,
  );

  const detected = await listDetectedSubscriptions();
  const visible = await listVisibleSubscriptions();
  const kfcDetected = detected.filter((sub) => sub.merchant_name === KFC_DEV_MERCHANT_KEY);
  const kfcVisible = visible.filter((sub) => sub.merchant_name === KFC_DEV_MERCHANT_KEY);

  const visibleKeys = new Set(
    kfcVisible.map((sub) => patternKey(sub.estimated_amount, sub.cadence)),
  );

  const expectedPatterns: Array<{ amount: number; cadence: SubscriptionCadence; shouldShow: boolean }> =
    [
      { amount: 12, cadence: "monthly", shouldShow: false },
      { amount: 18, cadence: "monthly", shouldShow: true },
      { amount: 12, cadence: "weekly", shouldShow: true },
    ];

  const patterns: KfcPatternVisibility[] = expectedPatterns.map((expected) => ({
    amount: expected.amount,
    cadence: expected.cadence,
    visible: visibleKeys.has(patternKey(expected.amount, expected.cadence)),
  }));

  const passed =
    notSubscriptionPatternKept &&
    patterns.every((pattern, index) => pattern.visible === expectedPatterns[index]!.shouldShow);

  const result: KfcIgnoreRemovalVerificationResult = {
    ignoredDecisionRemoved,
    notSubscriptionPatternKept,
    detectedCount: kfcDetected.length,
    visibleCount: kfcVisible.length,
    patterns,
    passed,
  };

  safeLogger.info("KFC ignore-removal verification", result);
  return result;
}
