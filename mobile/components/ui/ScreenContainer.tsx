import { forwardRef, type ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScreenContainerProps = {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
} & Pick<ScrollViewProps, "refreshControl">;

export const ScreenContainer = forwardRef<ScrollView, ScreenContainerProps>(
  function ScreenContainer(
    {
      children,
      scroll = true,
      className = "",
      contentClassName = "",
      refreshControl,
    },
    ref,
  ) {
    const insets = useSafeAreaInsets();
    const topPadding = Math.max(insets.top, 12) + 8;

    if (!scroll) {
      return (
        <View
          className={`flex-1 bg-surface-50 ${className}`}
          style={{ paddingTop: topPadding }}
        >
          {children}
        </View>
      );
    }

    return (
      <ScrollView
        ref={ref}
        className={`flex-1 bg-surface-50 ${className}`}
        contentContainerClassName={`px-5 pb-14 ${contentClassName}`}
        contentContainerStyle={{ paddingTop: topPadding }}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    );
  },
);
