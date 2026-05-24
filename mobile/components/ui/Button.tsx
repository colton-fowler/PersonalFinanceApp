import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
};

function BaseButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  containerClass,
  textClass,
  spinnerColor,
  className = "",
}: ButtonProps & {
  containerClass: string;
  textClass: string;
  spinnerColor: string;
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`items-center justify-center rounded-2xl px-4 py-3.5 ${
        isDisabled ? "opacity-50" : ""
      } ${containerClass} ${className}`}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <Text className={`text-center text-[15px] font-semibold ${textClass}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return (
    <BaseButton
      {...props}
      containerClass="bg-brand-600 active:bg-brand-700"
      textClass="text-white"
      spinnerColor="#ffffff"
    />
  );
}

export function SecondaryButton(props: ButtonProps) {
  return (
    <BaseButton
      {...props}
      containerClass="border border-slate-200 bg-white active:bg-slate-50"
      textClass="text-slate-800"
      spinnerColor="#0284c7"
    />
  );
}

export function DestructiveButton(props: ButtonProps) {
  return (
    <BaseButton
      {...props}
      containerClass="border border-rose-200 bg-rose-50/60 active:bg-rose-100"
      textClass="text-rose-700"
      spinnerColor="#be123c"
    />
  );
}
