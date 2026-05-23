import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { DashboardEmptyState } from "../dashboard/DashboardEmptyState";
import { TransactionCategoryChip } from "./TransactionCategoryChip";
import type { Transaction } from "../../db/models/transaction";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  formatTransactionAmount,
  formatTransactionDate,
} from "../../utils/formatTransactionAmount";

export type CategorySpendingRow = Transaction & {
  accountLabel: string;
};

type CategorySpendingModalProps = {
  visible: boolean;
  category: string | null;
  monthLabel: string;
  transactions: CategorySpendingRow[];
  categoryTotal: number;
  onClose: () => void;
  onSelectTransaction: (transactionId: string) => void;
};

export function CategorySpendingModal({
  visible,
  category,
  monthLabel,
  transactions,
  categoryTotal,
  onClose,
  onSelectTransaction,
}: CategorySpendingModalProps) {
  const title = category ?? "Category";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-slate-50">
        <View className="border-b border-slate-200 bg-white px-5 pb-4 pt-14">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-lg font-semibold text-slate-900">{title}</Text>
              <Text className="mt-1 text-sm text-slate-500">{monthLabel} spending</Text>
              {transactions.length > 0 ? (
                <Text className="mt-2 text-base font-bold text-red-600">
                  {formatCurrency(categoryTotal)}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              className="rounded-lg px-3 py-2 active:bg-slate-100"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text className="font-semibold text-brand-600">Close</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-10 pt-4"
        >
          {transactions.length === 0 ? (
            <DashboardEmptyState message="No transactions in this category for the selected month." />
          ) : (
            <View className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              {transactions.map((transaction) => {
                const displayName = transaction.merchant_name ?? transaction.name;
                const amountDisplay = formatTransactionAmount(transaction.amount);

                return (
                  <Pressable
                    key={transaction.id}
                    onPress={() => onSelectTransaction(transaction.id)}
                    className="flex-row items-start justify-between border-t border-slate-100 pt-3 active:bg-slate-50 first:border-t-0 first:pt-0"
                    accessibilityRole="button"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="font-medium text-slate-900">{displayName}</Text>
                      <TransactionCategoryChip
                        category={transaction.category}
                        categorySource={transaction.category_source}
                      />
                      <Text className="mt-1 text-sm text-slate-500">
                        {formatTransactionDate(transaction.date)} · {transaction.accountLabel}
                      </Text>
                    </View>
                    <Text
                      className={`text-base font-semibold ${
                        amountDisplay.isOutflow ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      {amountDisplay.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
