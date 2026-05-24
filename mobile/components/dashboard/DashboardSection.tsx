import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Card } from "../ui/Card";

type DashboardSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
};

export function DashboardSection({
  title,
  subtitle,
  children,
  action,
}: DashboardSectionProps) {
  return (
    <Card variant="elevated" className="px-0 py-0">
      <View className="flex-row items-start justify-between px-5 pb-1 pt-5">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-[17px] font-bold tracking-tight text-slate-900">
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-0.5 text-sm text-slate-500">{subtitle}</Text>
          ) : null}
        </View>
        {action}
      </View>
      <View className="px-5 pb-5 pt-3">{children}</View>
    </Card>
  );
}
