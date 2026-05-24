import { Text, View } from "react-native";

type DashboardEmptyStateProps = {
  message: string;
  title?: string;
};

export function DashboardEmptyState({ message, title }: DashboardEmptyStateProps) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8">
      <View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-white">
        <Text className="text-lg text-slate-400">○</Text>
      </View>
      {title ? (
        <Text className="text-center text-sm font-semibold text-slate-700">{title}</Text>
      ) : null}
      <Text
        className={`text-center text-sm leading-5 text-slate-500 ${
          title ? "mt-1" : ""
        }`}
      >
        {message}
      </Text>
    </View>
  );
}
