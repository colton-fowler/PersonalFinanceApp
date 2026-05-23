/** Dev-only test utilities — do not import from production screens. */
export {
  deleteKfcIgnoredMerchantDecision,
  ensureKfcNotSubscriptionPattern,
  KFC_DEV_MERCHANT_KEY,
  runKfcIgnoreRemovalVerification,
  seedKfcSubscriptionPatternTransactions,
  type KfcIgnoreRemovalVerificationResult,
  type KfcPatternVisibility,
} from "./kfcSubscriptionPatternDevUtil";
