import { Text, View } from "react-native";

export type PillTone = "neutral" | "brand" | "success" | "warning" | "violet" | "danger";

type PillProps = {
  label: string;
  tone?: PillTone;
  className?: string;
};

const toneClasses: Record<PillTone, { container: string; text: string }> = {
  neutral: { container: "bg-slate-100", text: "text-slate-600" },
  brand: { container: "bg-brand-50", text: "text-brand-700" },
  success: { container: "bg-emerald-50", text: "text-emerald-700" },
  warning: { container: "bg-amber-50", text: "text-amber-700" },
  violet: { container: "bg-violet-50", text: "text-violet-700" },
  danger: { container: "bg-rose-50", text: "text-rose-700" },
};

export function Pill({ label, tone = "neutral", className = "" }: PillProps) {
  const colors = toneClasses[tone];

  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${colors.container} ${className}`}
    >
      <Text className={`text-[11px] font-semibold tracking-wide ${colors.text}`}>
        {label}
      </Text>
    </View>
  );
}
