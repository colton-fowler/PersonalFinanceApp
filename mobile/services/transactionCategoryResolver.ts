import type { CategorySource } from "../db/models/transaction";
import { findRuleByMerchantKey } from "../db/repositories/transactionRulesRepository";
import { merchantKeyFromTransaction } from "../utils/merchantKey";

export type ResolvedTransactionCategory = {
  category: string;
  category_source: CategorySource;
};

/**
 * Picks category for Plaid sync when the row is not manually overridden.
 * Priority: user rule → Plaid category.
 */
export async function resolveCategoryForPlaidSync(
  merchantName: string | null,
  transactionName: string,
  plaidCategory: string,
): Promise<ResolvedTransactionCategory> {
  const merchantKey = merchantKeyFromTransaction(merchantName, transactionName);
  if (merchantKey) {
    const rule = await findRuleByMerchantKey(merchantKey);
    if (rule) {
      return { category: rule.category, category_source: "rule" };
    }
  }

  return {
    category: plaidCategory,
    category_source: "plaid",
  };
}
