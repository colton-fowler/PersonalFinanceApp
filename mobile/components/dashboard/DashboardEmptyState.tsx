import { Text, View } from "react-native";

type DashboardEmptyStateProps = {
  message: string;
};

export function DashboardEmptyState({ message }: DashboardEmptyStateProps) {
  return (
    <View className="rounded-xl bg-slate-50 px-4 py-5">
      <Text className="text-center text-sm leading-5 text-slate-600">{message}</Text>
    </View>
  );
}
