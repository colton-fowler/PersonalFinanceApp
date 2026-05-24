import { Text, View } from "react-native";
import { DashboardEmptyState } from "../dashboard/DashboardEmptyState";
import { TransactionCategoryChip } from "./TransactionCategoryChip";
import { Card } from "../ui/Card";
import { ListRow } from "../ui/ListRow";
import { MerchantAvatar } from "../ui/MerchantAvatar";
import { ModalShell } from "../ui/ModalShell";
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
    <ModalShell
      visible={visible}
      title={title}
      subtitle={`${monthLabel} spending`}
      onClose={onClose}
      headerExtra={
        transactions.length > 0 ? (
          <Text className="mt-3 text-2xl font-bold tabular-nums text-rose-600">
            {formatCurrency(categoryTotal)}
          </Text>
        ) : undefined
      }
    >
      {transactions.length === 0 ? (
        <DashboardEmptyState message="No transactions in this category for the selected month." />
      ) : (
        <Card variant="elevated" className="px-1 py-1">
          {transactions.map((transaction, index) => {
            const displayName = transaction.merchant_name ?? transaction.name;
            const amountDisplay = formatTransactionAmount(transaction.amount);

            return (
              <ListRow
                key={transaction.id}
                isFirst={index === 0}
                onPress={() => onSelectTransaction(transaction.id)}
                leading={<MerchantAvatar label={displayName} size="sm" />}
                title={displayName}
                subtitle={`${formatTransactionDate(transaction.date)} · ${transaction.accountLabel}`}
                trailing={
                  <Text
                    className={`text-base font-bold tabular-nums ${
                      amountDisplay.isOutflow ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {amountDisplay.text}
                  </Text>
                }
              >
                <TransactionCategoryChip
                  category={transaction.category}
                  categorySource={transaction.category_source}
                  className="mt-1.5"
                />
              </ListRow>
            );
          })}
        </Card>
      )}
    </ModalShell>
  );
}
