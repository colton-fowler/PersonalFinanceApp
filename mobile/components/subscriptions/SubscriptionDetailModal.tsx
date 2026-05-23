import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { Subscription } from "../../db/models/subscription";
import type { Transaction } from "../../db/models/transaction";
import { getSubscriptionById } from "../../db/repositories/subscriptionsRepository";
import {
  confirmSubscription,
  formatSubscriptionConfidenceLabel,
  ignoreSubscriptionMerchant,
  listTransactionsMatchingSubscription,
  rejectSubscription,
} from "../../services/subscriptionReviewService";
import { formatCadenceLabel } from "../../utils/formatCadence";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  formatTransactionAmount,
  formatTransactionDate,
} from "../../utils/formatTransactionAmount";

type SubscriptionDetailModalProps = {
  visible: boolean;
  subscriptionId: string | null;
  allTransactions: Transaction[];
  onClose: () => void;
  onDecisionSaved: () => void;
};

export function SubscriptionDetailModal({
  visible,
  subscriptionId,
  allTransactions,
  onClose,
  onDecisionSaved,
}: SubscriptionDetailModalProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingAction, setSavingAction] = useState<
    "confirm" | "reject" | "ignore" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    if (!subscriptionId) {
      setSubscription(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const row = await getSubscriptionById(subscriptionId);
      setSubscription(row);
      if (!row) {
        setError("Subscription not found.");
      }
    } catch {
      setError("Could not load subscription.");
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => {
    if (visible) {
      void loadSubscription();
    }
  }, [visible, loadSubscription]);

  const matchingTransactions = useMemo(() => {
    if (!subscription) {
      return [];
    }
    return listTransactionsMatchingSubscription(subscription, allTransactions);
  }, [subscription, allTransactions]);

  const runAction = async (
    action: "confirm" | "reject" | "ignore",
    handler: (id: string) => Promise<void>,
  ) => {
    if (!subscription || savingAction) {
      return;
    }

    setSavingAction(action);
    setError(null);
    try {
      await handler(subscription.id);
      onDecisionSaved();
      onClose();
    } catch {
      setError("Could not save your choice.");
    } finally {
      setSavingAction(null);
    }
  };

  const amountLabel =
    subscription?.cadence === "weekly"
      ? "Predicted weekly amount"
      : "Predicted monthly amount";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-slate-50">
        <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-5 pb-4 pt-14">
          <Text className="text-lg font-semibold text-slate-900">Subscription</Text>
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

        {!loading && subscription ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 px-5 pb-10 pt-5"
          >
            <View className="rounded-2xl bg-white px-5 py-5 shadow-sm">
              <Text className="text-xl font-bold text-slate-900">
                {subscription.display_name}
              </Text>
              <Text className="mt-1 text-sm text-slate-500">
                {formatSubscriptionConfidenceLabel(subscription)}
              </Text>
              <Text className="mt-4 text-sm font-medium text-slate-500">
                {amountLabel}
              </Text>
              <Text className="mt-1 text-3xl font-bold text-slate-900">
                {formatCurrency(subscription.estimated_amount)}
              </Text>
              <Text className="mt-3 text-sm text-slate-500">
                {formatCadenceLabel(subscription.cadence)} · Next expected{" "}
                {formatTransactionDate(subscription.next_estimated_charge_date)}
              </Text>
            </View>

            <View className="rounded-2xl bg-white px-5 py-5 shadow-sm">
              <Text className="text-base font-semibold text-slate-900">
                Recent matching charges
              </Text>
              {matchingTransactions.length === 0 ? (
                <Text className="mt-3 text-sm text-slate-500">
                  No matching transactions found.
                </Text>
              ) : (
                <View className="mt-3">
                  {matchingTransactions.map((transaction) => {
                    const displayName = transaction.merchant_name ?? transaction.name;
                    const amountDisplay = formatTransactionAmount(transaction.amount);

                    return (
                      <View
                        key={transaction.id}
                        className="flex-row items-start justify-between border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
                      >
                        <View className="flex-1 pr-3">
                          <Text className="font-medium text-slate-900">{displayName}</Text>
                          <Text className="mt-1 text-sm text-slate-500">
                            {formatTransactionDate(transaction.date)}
                          </Text>
                        </View>
                        <Text className="text-base font-semibold text-red-600">
                          {amountDisplay.text}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View className="rounded-2xl bg-white px-5 py-5 shadow-sm">
              <Text className="text-base font-semibold text-slate-900">Your review</Text>
              <Text className="mt-1 text-sm text-slate-500">
                Help improve detection by confirming real subscriptions or hiding false
                positives.
              </Text>

              <Pressable
                onPress={() => void runAction("confirm", confirmSubscription)}
                disabled={Boolean(savingAction)}
                className={`mt-4 items-center rounded-xl bg-brand-600 py-3 ${
                  savingAction ? "opacity-50" : "active:bg-brand-700"
                }`}
              >
                {savingAction === "confirm" ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="font-semibold text-white">Confirm subscription</Text>
                )}
              </Pressable>

              <Text className="mt-3 text-sm text-slate-500">
                Mark this recurring charge pattern as not a subscription. Other
                patterns from this merchant may still appear.
              </Text>

              <Pressable
                onPress={() => void runAction("reject", rejectSubscription)}
                disabled={Boolean(savingAction)}
                className={`mt-2 items-center rounded-xl border border-slate-200 py-3 ${
                  savingAction ? "opacity-50" : "active:bg-slate-50"
                }`}
              >
                {savingAction === "reject" ? (
                  <ActivityIndicator size="small" color="#0284c7" />
                ) : (
                  <Text className="font-semibold text-slate-700">Not a subscription</Text>
                )}
              </Pressable>

              <Text className="mt-3 text-sm text-slate-500">
                Stop detecting any subscription from this merchant in the future.
              </Text>

              <Pressable
                onPress={() => void runAction("ignore", ignoreSubscriptionMerchant)}
                disabled={Boolean(savingAction)}
                className={`mt-2 items-center rounded-xl border border-red-200 py-3 ${
                  savingAction ? "opacity-50" : "active:bg-red-50"
                }`}
              >
                {savingAction === "ignore" ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Text className="font-semibold text-red-700">Ignore this merchant</Text>
                )}
              </Pressable>
            </View>

            {error ? (
              <Text className="text-center text-sm text-red-600">{error}</Text>
            ) : null}
          </ScrollView>
        ) : null}

        {!loading && !subscription && error ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-slate-600">{error}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
