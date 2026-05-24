import { Text, View } from "react-native";

type MerchantAvatarProps = {
  label: string;
  size?: "sm" | "md";
};

export function MerchantAvatar({ label, size = "md" }: MerchantAvatarProps) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  const sizeClass = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const textClass = size === "sm" ? "text-sm" : "text-base";

  return (
    <View
      className={`${sizeClass} items-center justify-center rounded-2xl bg-slate-900/5`}
    >
      <Text className={`${textClass} font-bold text-slate-700`}>{initial}</Text>
    </View>
  );
}
