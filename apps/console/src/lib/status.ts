import {
  allowedTransitions,
  whoMayTrigger,
  type OrderStatus,
  type Role,
} from "@easy-logi/shared";

/** Human-readable label for a status. */
export function statusLabel(status: OrderStatus): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Badge colour family for a status. */
export function statusBadgeVariant(
  status: OrderStatus,
): "default" | "secondary" | "success" | "warning" | "destructive" {
  switch (status) {
    case "closed":
    case "delivered":
    case "cleared":
      return "success";
    case "on_hold":
      return "warning";
    case "disputed":
    case "cancelled":
      return "destructive";
    default:
      return "default";
  }
}

/** The next statuses this role may move an order to from `current` (for the UI select). */
export function nextStatusOptions(current: OrderStatus, role: Role): OrderStatus[] {
  return allowedTransitions(current).filter((to) => whoMayTrigger(current, to).includes(role));
}
