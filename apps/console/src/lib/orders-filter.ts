import type { OrderStatus } from "@easy-logi/shared";
import { STATUS_PILL_TONE } from "@easy-logi/ui";

/** The filter-tab groups on the Orders screen. */
export type OrderGroup = "action" | "production" | "port" | "delivered" | "other";

const PRODUCTION: OrderStatus[] = ["deposit_paid", "in_production", "qc_passed", "balance_paid"];
const DELIVERED: OrderStatus[] = ["delivered", "fit_confirmed", "closed"];
const PORT: OrderStatus[] = ["at_port_durban", "at_port_maputo"];

/**
 * Classify a status into one filter group. Priority: needs-action (the signal-deep StatusPill
 * tone) wins over everything, then port, then delivered, then production; else "other".
 */
export function orderGroup(status: OrderStatus): OrderGroup {
  if (STATUS_PILL_TONE[status] === "action") return "action";
  if (PORT.includes(status)) return "port";
  if (DELIVERED.includes(status)) return "delivered";
  if (PRODUCTION.includes(status)) return "production";
  return "other";
}

export type OrderTabId = "all" | "action" | "production" | "port" | "delivered";

export const ORDER_TABS: ReadonlyArray<{ id: OrderTabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "action", label: "Needs action" },
  { id: "production", label: "In production" },
  { id: "port", label: "At port" },
  { id: "delivered", label: "Delivered" },
];
