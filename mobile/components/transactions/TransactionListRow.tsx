import { Text, View } from "react-native";
import type { Transaction } from "../../db/models/transaction";
import {
  formatTransactionAmount,
  formatTransactionDate,
} from "../../utils/formatTransactionAmount";
import { ListRow } from "../ui/ListRow";
import { MerchantAvatar } from "../ui/MerchantAvatar";
import { Pill } from "../ui/Pill";
import { TransactionCategoryChip } from "./TransactionCategoryChip";

type TransactionListRowProps = {
  transaction: Transaction;
  accountLabel?: string;
  isFirst?: boolean;
  onPress: () => void;
};

export function TransactionListRow({
  transaction,
  accountLabel,
  isFirst = false,
  onPress,
}: TransactionListRowProps) {
  const displayName = transaction.merchant_name ?? transaction.name;
  const amountDisplay = formatTransactionAmount(transaction.amount);
  const subtitleParts = [formatTransactionDate(transaction.date)];
  if (accountLabel) {
    subtitleParts.push(accountLabel);
  }

  return (
    <ListRow
      isFirst={isFirst}
      onPress={onPress}
      leading={<MerchantAvatar label={displayName} size="sm" />}
      title={displayName}
      subtitle={subtitleParts.join(" · ")}
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
      <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5">
        <TransactionCategoryChip
          category={transaction.category}
          categorySource={transaction.category_source}
          className="mt-0"
        />
        {transaction.pending ? <Pill label="Pending" tone="warning" /> : null}
      </View>
    </ListRow>
  );
}
