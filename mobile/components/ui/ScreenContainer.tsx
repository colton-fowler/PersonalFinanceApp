import type { ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";

type ScreenContainerProps = {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
} & Pick<ScrollViewProps, "refreshControl">;

export function ScreenContainer({
  children,
  scroll = true,
  className = "",
  contentClassName = "",
  refreshControl,
}: ScreenContainerProps) {
  if (!scroll) {
    return (
      <View className={`flex-1 bg-surface-50 ${className}`}>{children}</View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 bg-surface-50 ${className}`}
      contentContainerClassName={`px-5 pb-14 pt-12 ${contentClassName}`}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}
