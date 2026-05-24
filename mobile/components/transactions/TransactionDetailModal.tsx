import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { USER_SELECTABLE_CATEGORIES } from "../../db/models/category";
import type { Transaction } from "../../db/models/transaction";
import { upsertTransactionRuleByMerchantKey } from "../../db/repositories/transactionRulesRepository";
import {
  getTransactionById,
  setTransactionCategoryManual,
} from "../../db/repositories/transactionsRepository";
import { Card } from "../ui/Card";
import { SecondaryButton } from "../ui/Button";
import { ModalShell } from "../ui/ModalShell";
import { Pill } from "../ui/Pill";
import {
  formatTransactionAmount,
  formatTransactionDate,
} from "../../utils/formatTransactionAmount";
import { merchantKeyFromTransaction } from "../../utils/merchantKey";

type TransactionDetailModalProps = {
  transactionId: string | null;
  accountLabel: string;
  visible: boolean;
  onClose: () => void;
  onCategorySaved: () => void;
};

export function TransactionDetailModal({
  transactionId,
  accountLabel,
  visible,
  onClose,
  onCategorySaved,
}: TransactionDetailModalProps) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState(false);
  const [ruleMessage, setRuleMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTransaction = useCallback(async () => {
    if (!transactionId) {
      setTransaction(null);
      return;
    }

    setLoading(true);
    setError(null);
    setRuleMessage(null);
    try {
      const row = await getTransactionById(transactionId);
      setTransaction(row);
      if (!row) {
        setError("Transaction not found.");
      }
    } catch {
      setError("Could not load transaction.");
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    if (visible) {
      void loadTransaction();
    }
  }, [visible, loadTransaction]);

  const handleSelectCategory = async (category: string) => {
    if (!transaction || savingCategory) {
      return;
    }
    if (transaction.category === category && transaction.category_source === "manual") {
      return;
    }

    setSavingCategory(category);
    setError(null);
    setRuleMessage(null);
    try {
      const updated = await setTransactionCategoryManual(transaction.id, category);
      if (!updated) {
        setError("Could not save category.");
        return;
      }
      setTransaction(updated);
      onCategorySaved();
    } catch {
      setError("Could not save category.");
    } finally {
      setSavingCategory(null);
    }
  };

  const displayName = transaction
    ? (transaction.merchant_name ?? transaction.name)
    : "";
  const amountDisplay = transaction
    ? formatTransactionAmount(transaction.amount)
    : null;
  const sourceLabel = transaction?.plaid_transaction_id ? "Plaid" : "Local";
  const merchantKey = transaction
    ? merchantKeyFromTransaction(transaction.merchant_name, transaction.name)
    : null;
  const canCreateMerchantRule =
    transaction?.category_source === "manual" && merchantKey !== null;

  const handleCreateMerchantRule = async () => {
    if (!transaction || !merchantKey || savingRule) {
      return;
    }

    setSavingRule(true);
    setError(null);
    setRuleMessage(null);
    try {
      await upsertTransactionRuleByMerchantKey(
        merchantKey,
        transaction.category,
        transaction.merchant_name ?? transaction.name,
      );
      setRuleMessage(
        `Future transactions from this merchant will use "${transaction.category}". Refresh to apply to synced rows.`,
      );
    } catch {
      setError("Could not save merchant rule.");
    } finally {
      setSavingRule(false);
    }
  };

  const categorySetByLabel =
    transaction?.category_source === "manual"
      ? "You"
      : transaction?.category_source === "rule"
        ? "Merchant rule"
        : null;

  return (
    <ModalShell
      visible={visible}
      title="Transaction"
      onClose={onClose}
      loading={loading}
    >
      {!loading && transaction && amountDisplay ? (
        <>
          <Card variant="elevated">
            <Text className="text-xl font-bold tracking-tight text-slate-900">
              {displayName}
            </Text>
            <Text
              className={`mt-2 text-4xl font-bold tracking-tight tabular-nums ${
                amountDisplay.isOutflow ? "text-rose-600" : "text-emerald-700"
              }`}
            >
              {amountDisplay.text}
            </Text>
            <Text className="mt-3 text-sm text-slate-500">
              {formatTransactionDate(transaction.date)}
            </Text>
            {transaction.pending ? (
              <Pill label="Pending" tone="warning" className="mt-3" />
            ) : null}
          </Card>

          <Card variant="elevated">
            <Text className="mb-1 text-base font-bold text-slate-900">Details</Text>
            <DetailRow label="Account" value={accountLabel} />
            <DetailRow label="Category" value={transaction.category} />
            <DetailRow
              label="Status"
              value={transaction.pending ? "Pending" : "Posted"}
            />
            <DetailRow label="Source" value={sourceLabel} />
            {categorySetByLabel ? (
              <DetailRow label="Category set by" value={categorySetByLabel} />
            ) : null}
          </Card>

          <Card variant="elevated">
            <Text className="text-base font-bold text-slate-900">Change category</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">
              Saved on this device and kept after sync.
            </Text>
            <View className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              {USER_SELECTABLE_CATEGORIES.map((category, index) => {
                const isSelected = transaction.category === category;
                const isSaving = savingCategory === category;

                return (
                  <Pressable
                    key={category}
                    onPress={() => void handleSelectCategory(category)}
                    disabled={Boolean(savingCategory)}
                    className={`flex-row items-center justify-between border-t border-slate-100 px-4 py-3.5 ${
                      index === 0 ? "border-t-0" : ""
                    } ${isSelected ? "bg-brand-50/80" : "active:bg-slate-50"} ${
                      savingCategory ? "opacity-60" : ""
                    }`}
                  >
                    <Text
                      className={`text-[15px] ${
                        isSelected ? "font-semibold text-brand-700" : "text-slate-900"
                      }`}
                    >
                      {category}
                    </Text>
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#0284c7" />
                    ) : isSelected ? (
                      <Text className="text-sm font-semibold text-brand-600">Selected</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {canCreateMerchantRule ? (
            <Card variant="elevated">
              <Text className="text-base font-bold text-slate-900">Merchant rule</Text>
              <Text className="mt-1 text-sm leading-5 text-slate-500">
                Optionally auto-categorize future transactions from this merchant.
              </Text>
              <SecondaryButton
                title="Apply to future transactions from this merchant"
                onPress={() => void handleCreateMerchantRule()}
                loading={savingRule}
                disabled={savingRule}
                className="mt-4"
              />
              {ruleMessage ? (
                <Text className="mt-3 text-sm leading-5 text-brand-700">{ruleMessage}</Text>
              ) : null}
            </Card>
          ) : null}

          {error ? (
            <Text className="text-center text-sm text-rose-600">{error}</Text>
          ) : null}
        </>
      ) : null}

      {!loading && !transaction && error ? (
        <Card variant="muted">
          <Text className="text-center text-slate-600">{error}</Text>
        </Card>
      ) : null}
    </ModalShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-t border-slate-100 py-3.5 first:border-t-0">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="max-w-[58%] text-right text-sm font-semibold text-slate-900">
        {value}
      </Text>
    </View>
  );
}
