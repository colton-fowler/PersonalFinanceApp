import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Card } from "../ui/Card";
import {
  DestructiveButton,
  PrimaryButton,
  SecondaryButton,
} from "../ui/Button";
import { ListRow } from "../ui/ListRow";
import { MerchantAvatar } from "../ui/MerchantAvatar";
import { ModalShell } from "../ui/ModalShell";
import { Pill } from "../ui/Pill";
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
import { getSubscriptionStatusBadge } from "../../utils/subscriptionUi";

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

  const statusBadge = subscription ? getSubscriptionStatusBadge(subscription) : null;

  return (
    <ModalShell
      visible={visible}
      title="Subscription"
      subtitle={subscription?.display_name}
      onClose={onClose}
      loading={loading}
    >
      {!loading && subscription && statusBadge ? (
        <>
          <Card variant="elevated">
            <View className="flex-row items-start">
              <MerchantAvatar label={subscription.display_name} />
              <View className="ml-4 min-w-0 flex-1">
                <Text className="text-xl font-bold tracking-tight text-slate-900">
                  {subscription.display_name}
                </Text>
                <View className="mt-2 flex-row flex-wrap gap-1.5">
                  <Pill label={statusBadge.label} tone={statusBadge.tone} />
                  <Pill label={formatCadenceLabel(subscription.cadence)} tone="neutral" />
                </View>
                <Text className="mt-3 text-sm leading-5 text-slate-500">
                  {formatSubscriptionConfidenceLabel(subscription)}
                </Text>
              </View>
            </View>

            <View className="mt-6 border-t border-slate-100 pt-5">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {amountLabel}
              </Text>
              <Text className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
                {formatCurrency(subscription.estimated_amount)}
              </Text>
              <Text className="mt-2 text-sm text-slate-500">
                Next expected {formatTransactionDate(subscription.next_estimated_charge_date)}
              </Text>
            </View>
          </Card>

          <Card variant="elevated">
            <Text className="text-base font-bold text-slate-900">Recent matching charges</Text>
            {matchingTransactions.length === 0 ? (
              <Text className="mt-3 text-sm text-slate-500">
                No matching transactions found.
              </Text>
            ) : (
              <View className="mt-2">
                {matchingTransactions.map((transaction, index) => {
                  const displayName = transaction.merchant_name ?? transaction.name;
                  const amountDisplay = formatTransactionAmount(transaction.amount);

                  return (
                    <ListRow
                      key={transaction.id}
                      isFirst={index === 0}
                      title={displayName}
                      subtitle={formatTransactionDate(transaction.date)}
                      trailing={
                        <Text className="text-base font-bold tabular-nums text-rose-600">
                          {amountDisplay.text}
                        </Text>
                      }
                    />
                  );
                })}
              </View>
            )}
          </Card>

          <Card variant="elevated">
            <Text className="text-base font-bold text-slate-900">Your review</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">
              Confirm real subscriptions or hide false positives to improve detection.
            </Text>

            <View className="mt-5 gap-4">
              <View>
                <PrimaryButton
                  title="Confirm subscription"
                  onPress={() => void runAction("confirm", confirmSubscription)}
                  loading={savingAction === "confirm"}
                  disabled={Boolean(savingAction)}
                />
                <Text className="mt-2 text-xs leading-5 text-slate-500">
                  Keep this subscription on your dashboard after future syncs.
                </Text>
              </View>

              <View className="border-t border-slate-100 pt-4">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hide this pattern
                </Text>
                <SecondaryButton
                  title="Not a subscription"
                  onPress={() => void runAction("reject", rejectSubscription)}
                  loading={savingAction === "reject"}
                  disabled={Boolean(savingAction)}
                />
                <Text className="mt-2 text-xs leading-5 text-slate-500">
                  Only hides this amount and cadence. Other patterns from this merchant may
                  still appear.
                </Text>
              </View>

              <View className="border-t border-slate-100 pt-4">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Block merchant
                </Text>
                <DestructiveButton
                  title="Ignore this merchant"
                  onPress={() => void runAction("ignore", ignoreSubscriptionMerchant)}
                  loading={savingAction === "ignore"}
                  disabled={Boolean(savingAction)}
                />
                <Text className="mt-2 text-xs leading-5 text-slate-500">
                  Stops detecting subscriptions from this merchant in the future.
                </Text>
              </View>
            </View>
          </Card>

          {error ? (
            <Text className="text-center text-sm text-rose-600">{error}</Text>
          ) : null}
        </>
      ) : null}

      {!loading && !subscription && error ? (
        <Card variant="muted">
          <Text className="text-center text-slate-600">{error}</Text>
        </Card>
      ) : null}
    </ModalShell>
  );
}
