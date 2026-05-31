import type { Account } from "../../db/models/account";
import { formatAccountTypeLabel } from "../../utils/formatAccountLabel";
import { formatCurrency } from "../../utils/formatCurrency";
import Svg, { Path } from "react-native-svg";
import { Pressable, Text, View } from "react-native";

type AccountListRowProps = {
  account: Account;
  isFirst?: boolean;
  onPress: () => void;
};

function ChevronRight() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      <Path
        d="M9 6l6 6-6 6"
        stroke="#64748b"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AccountListRow({ account, isFirst = false, onPress }: AccountListRowProps) {
  const divider = isFirst ? "" : "border-t border-slate-100/90";

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-start py-3.5 ${divider} active:bg-slate-50/80`}
      accessibilityRole="button"
      accessibilityLabel={`${account.account_name}, ${formatCurrency(account.current_balance)}`}
    >
      <View className="min-w-0 flex-1 pr-3">
        <Text
          className="text-base font-bold leading-snug text-slate-900"
          numberOfLines={2}
        >
          {account.account_name}
        </Text>
        <View className="mt-1.5 self-start rounded-full bg-slate-100 px-2 py-0.5">
          <Text className="text-xs font-medium text-slate-600">
            {formatAccountTypeLabel(account)}
          </Text>
        </View>
      </View>
      <View className="shrink-0 flex-row items-center gap-0.5 pt-0.5">
        <Text className="text-base font-semibold tabular-nums text-slate-900">
          {formatCurrency(account.current_balance)}
        </Text>
        <ChevronRight />
      </View>
    </Pressable>
  );
}
