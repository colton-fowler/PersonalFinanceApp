import { Pill } from "../ui/Pill";
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
  className?: string;
};

export function TransactionCategoryChip({
  category,
  categorySource,
  className = "mt-1.5",
}: TransactionCategoryChipProps) {
  const tone =
    categorySource === "manual"
      ? "brand"
      : categorySource === "rule"
        ? "violet"
        : "neutral";

  return (
    <Pill
      label={formatCategoryChipLabel(category, categorySource)}
      tone={tone}
      className={className}
    />
  );
}
