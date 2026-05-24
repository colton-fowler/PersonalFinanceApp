import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type ListRowProps = {
  children?: ReactNode;
  trailing?: ReactNode;
  leading?: ReactNode;
  onPress?: () => void;
  isFirst?: boolean;
  subtitle?: string;
  title?: string;
};

export function ListRow({
  children,
  trailing,
  leading,
  onPress,
  isFirst = false,
  title,
  subtitle,
}: ListRowProps) {
  const divider = isFirst ? "" : "border-t border-slate-100/90";
  const body = (
    <>
      {leading ? <View className="mr-3 mt-0.5">{leading}</View> : null}
      <View className="min-w-0 flex-1 pr-3">
        {title ? (
          <Text className="text-[15px] font-semibold text-slate-900" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>
      {trailing ? <View className="shrink-0 items-end justify-center">{trailing}</View> : null}
    </>
  );

  const rowClass = `flex-row items-start py-3.5 ${divider} ${
    onPress ? "active:bg-slate-50/80" : ""
  }`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={rowClass}
        accessibilityRole="button"
      >
        {body}
      </Pressable>
    );
  }

  return <View className={rowClass}>{body}</View>;
}
