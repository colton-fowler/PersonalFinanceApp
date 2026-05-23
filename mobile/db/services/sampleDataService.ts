import { withTransaction } from "../connection";
import type { TransactionCategory } from "../models/category";
import { createAccount } from "../repositories/accountsRepository";
import { setSetting } from "../repositories/settingsRepository";
import { createSubscription } from "../repositories/subscriptionsRepository";
import { createTransaction } from "../repositories/transactionsRepository";
import { listAccounts } from "../repositories/accountsRepository";
import { createId } from "../utils/id";
import { safeLogger } from "../../security/safeLogger";
import { SETTING_KEYS } from "../models/setting";

export type SampleDataSummary = {
  accounts: number;
  transactions: number;
  subscriptions: number;
};

/**
 * Dev-only fixture data for UI-less testing.
 * Uses fictional merchants — still treat as sensitive; never log row payloads.
 */
export async function seedSampleData(): Promise<SampleDataSummary> {
  const existing = await listAccounts();
  if (existing.length > 0) {
    safeLogger.warn("Sample data skipped — accounts already exist", {
      count: existing.length,
    });
    return { accounts: existing.length, transactions: 0, subscriptions: 0 };
  }

  const summary = await withTransaction(async (db) => {
    const checking = await createAccount(
      {
        id: createId(),
        plaid_account_id: "sample_plaid_checking",
        institution_name: "Sample Credit Union",
        account_name: "Checking",
        account_type: "depository",
        subtype: "checking",
        current_balance: 4250.5,
        available_balance: 4250.5,
      },
      db,
    );

    const credit = await createAccount(
      {
        id: createId(),
        plaid_account_id: "sample_plaid_credit",
        institution_name: "Sample Card Bank",
        account_name: "Credit Card",
        account_type: "credit",
        subtype: "credit card",
        current_balance: -680.25,
        available_balance: 3319.75,
      },
      db,
    );

    const txSpecs: Array<{
      account_id: string;
      name: string;
      amount: number;
      category: TransactionCategory;
      date: string;
      merchant_name: string;
    }> = [
      {
        account_id: checking.id,
        name: "Grocery run",
        amount: 86.42,
        category: "Food",
        date: "2026-05-18",
        merchant_name: "Sample Market",
      },
      {
        account_id: checking.id,
        name: "Paycheck",
        amount: -2400,
        category: "Income",
        date: "2026-05-15",
        merchant_name: "Sample Employer",
      },
      {
        account_id: credit.id,
        name: "Streaming plan",
        amount: 15.99,
        category: "Entertainment",
        date: "2026-05-12",
        merchant_name: "Sample Stream",
      },
      {
        account_id: credit.id,
        name: "Fuel",
        amount: 52.1,
        category: "Transportation",
        date: "2026-05-10",
        merchant_name: "Sample Gas",
      },
    ];

    for (const spec of txSpecs) {
      await createTransaction(
        {
          account_id: spec.account_id,
          name: spec.name,
          amount: spec.amount,
          category: spec.category,
          date: spec.date,
          merchant_name: spec.merchant_name,
        },
        db,
      );
    }

    await createSubscription(
      {
        merchant_name: "Sample Stream",
        display_name: "Sample Stream",
        estimated_amount: 15.99,
        cadence: "monthly",
        last_charge_date: "2026-05-12",
        next_estimated_charge_date: "2026-06-12",
        confidence: "high",
        source: "manual",
      },
      db,
    );

    await createSubscription(
      {
        merchant_name: "Sample Gym",
        display_name: "Sample Gym",
        estimated_amount: 39,
        cadence: "monthly",
        last_charge_date: "2026-05-01",
        next_estimated_charge_date: "2026-06-01",
        confidence: "high",
        source: "manual",
      },
      db,
    );

    await setSetting(SETTING_KEYS.LAST_SYNC_AT, "2026-05-20T12:00:00.000Z", db);

    return {
      accounts: 2,
      transactions: txSpecs.length,
      subscriptions: 2,
    };
  });

  safeLogger.info("Sample data seeded", summary);
  return summary;
}
