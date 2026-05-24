import type { Subscription } from "../db/models/subscription";
import type { PillTone } from "../components/ui/Pill";

export type SubscriptionStatusBadge = {
  label: string;
  tone: PillTone;
};

export function getSubscriptionStatusBadge(
  subscription: Subscription,
): SubscriptionStatusBadge {
  if (subscription.source === "manual") {
    return { label: "Confirmed", tone: "success" };
  }

  switch (subscription.confidence) {
    case "high":
      return { label: "High confidence", tone: "brand" };
    case "medium":
      return { label: "Likely recurring", tone: "violet" };
    default:
      return { label: "Detected", tone: "neutral" };
  }
}

export function getSubscriptionInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?";
}
