import type { SubscriptionCadence } from "../db/models/subscription";

export function formatCadenceLabel(cadence: SubscriptionCadence): string {
  switch (cadence) {
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    default:
      return "Unknown";
  }
}
