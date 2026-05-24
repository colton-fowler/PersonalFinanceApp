import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

type CardVariant = "default" | "muted" | "elevated" | "hero";

type CardProps = ViewProps & {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
};

const variantClasses: Record<CardVariant, string> = {
  default: "rounded-3xl border border-slate-200/70 bg-white px-5 py-5",
  muted: "rounded-2xl bg-slate-100/80 px-4 py-4",
  elevated: "rounded-3xl border border-slate-200/60 bg-white px-5 py-5 shadow-sm",
  hero: "rounded-[28px] bg-slate-900 px-6 py-7",
};

export function Card({
  children,
  variant = "default",
  className = "",
  ...props
}: CardProps) {
  return (
    <View className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </View>
  );
}
