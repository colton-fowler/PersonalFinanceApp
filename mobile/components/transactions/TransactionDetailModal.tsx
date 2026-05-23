import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { USER_SELECTABLE_CATEGORIES } from "../../db/models/category";
import type { Transaction } from "../../db/models/transaction";
import { upsertTransactionRuleByMerchantKey } from "../../db/repositories/transactionRulesRepository";
import {
  getTransactionById,
  setTransactionCategoryManual,
} from "../../db/repositories/transactionsRepository";
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-slate-50">
        <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-5 pb-4 pt-14">
          <Text className="text-lg font-semibold text-slate-900">Transaction</Text>
          <Pressable
            onPress={onClose}
            className="rounded-lg px-3 py-2 active:bg-slate-100"
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text className="font-semibold text-brand-600">Close</Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : null}

        {!loading && transaction && amountDisplay ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 px-5 pb-10 pt-5"
          >
            <View className="rounded-2xl bg-white px-5 py-5 shadow-sm">
              <Text className="text-xl font-bold text-slate-900">{displayName}</Text>
              <Text
                className={`mt-2 text-3xl font-bold ${
                  amountDisplay.isOutflow ? "text-red-600" : "text-green-700"
                }`}
              >
                {amountDisplay.text}
              </Text>
              <Text className="mt-3 text-sm text-slate-500">
                {formatTransactionDate(transaction.date)}
              </Text>
            </View>

            <DetailSection title="Details">
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
            </DetailSection>

            <View className="rounded-2xl bg-white px-5 py-5 shadow-sm">
              <Text className="text-base font-semibold text-slate-900">
                Change category
              </Text>
              <Text className="mt-1 text-sm text-slate-500">
                Your choice is saved on this device and kept after sync.
              </Text>
              <View className="mt-4 gap-1">
                {USER_SELECTABLE_CATEGORIES.map((category) => {
                  const isSelected = transaction.category === category;
                  const isSaving = savingCategory === category;

                  return (
                    <Pressable
                      key={category}
                      onPress={() => void handleSelectCategory(category)}
                      disabled={Boolean(savingCategory)}
                      className={`flex-row items-center justify-between rounded-xl px-4 py-3 ${
                        isSelected ? "bg-brand-50" : "active:bg-slate-50"
                      } ${savingCategory ? "opacity-60" : ""}`}
                    >
                      <Text
                        className={`text-base ${
                          isSelected ? "font-semibold text-brand-700" : "text-slate-900"
                        }`}
                      >
                        {category}
                      </Text>
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#0284c7" />
                      ) : isSelected ? (
                        <Text className="text-sm font-medium text-brand-600">Selected</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {canCreateMerchantRule ? (
              <View className="rounded-2xl bg-white px-5 py-5 shadow-sm">
                <Text className="text-base font-semibold text-slate-900">
                  Merchant rule
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Optionally categorize future transactions from this merchant
                  automatically. This does not change past manual edits.
                </Text>
                <Pressable
                  onPress={() => void handleCreateMerchantRule()}
                  disabled={savingRule}
                  className={`mt-4 items-center rounded-xl border border-brand-200 bg-brand-50 py-3 ${
                    savingRule ? "opacity-50" : "active:bg-brand-100"
                  }`}
                >
                  {savingRule ? (
                    <ActivityIndicator size="small" color="#0284c7" />
                  ) : (
                    <Text className="text-center text-sm font-semibold text-brand-700">
                      Apply to future transactions from this merchant
                    </Text>
                  )}
                </Pressable>
                {ruleMessage ? (
                  <Text className="mt-3 text-sm leading-5 text-brand-700">
                    {ruleMessage}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {error ? (
              <Text className="text-center text-sm text-red-600">{error}</Text>
            ) : null}
          </ScrollView>
        ) : null}

        {!loading && !transaction && error ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-slate-600">{error}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="rounded-2xl bg-white px-5 py-5 shadow-sm">
      <Text className="mb-3 text-base font-semibold text-slate-900">{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="max-w-[60%] text-right text-sm font-medium text-slate-900">
        {value}
      </Text>
    </View>
  );
}
