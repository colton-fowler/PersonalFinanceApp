import { Text, View } from "react-native";
import type { CategorySource } from "../../db/models/transaction";

export function formatCategoryChipLabel(
  category: string,
  categorySource: CategorySource,
): string {
  const label = category.trim() || "Other";
  if (categorySource === "manual") {
    return `${label} • You`;
  }
  if (categorySource === "rule") {
    return `${label} • Auto`;
  }
  return label;
}

type TransactionCategoryChipProps = {
  category: string;
  categorySource: CategorySource;
};

export function TransactionCategoryChip({
  category,
  categorySource,
}: TransactionCategoryChipProps) {
  const isManual = categorySource === "manual";
  const isRule = categorySource === "rule";

  return (
    <View
      className={`mt-1.5 self-start rounded-full px-2 py-0.5 ${
        isManual ? "bg-brand-50" : isRule ? "bg-violet-50" : "bg-slate-100"
      }`}
    >
      <Text
        className={`text-xs font-medium ${
          isManual ? "text-brand-700" : isRule ? "text-violet-700" : "text-slate-600"
        }`}
        numberOfLines={1}
      >
        {formatCategoryChipLabel(category, categorySource)}
      </Text>
    </View>
  );
}
