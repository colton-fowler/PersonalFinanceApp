import type { ReactNode } from "react";
import { Text, View } from "react-native";

type DashboardSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function DashboardSection({
  title,
  subtitle,
  children,
}: DashboardSectionProps) {
  return (
    <View className="rounded-2xl border border-slate-100 bg-white px-5 py-5 shadow-sm">
      <Text className="text-base font-semibold text-slate-900">{title}</Text>
      {subtitle ? (
        <Text className="mt-1 text-sm text-slate-500">{subtitle}</Text>
      ) : null}
      <View className="mt-4">{children}</View>
    </View>
  );
}
