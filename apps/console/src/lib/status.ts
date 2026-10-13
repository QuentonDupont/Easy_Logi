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
    case "matched":
    case "deposit_paid":
    case "balance_paid":
    case "qc_passed":
    case "cleared":
    case "delivered":
    case "fit_confirmed":
    case "closed":
      return "success";
    case "qc_pending":
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

/** The order's lifecycle as six human-readable phases (for the dashboard + status journey). */
export const ORDER_PHASES: ReadonlyArray<{ key: string; label: string; statuses: OrderStatus[] }> = [
  { key: "fitment", label: "Fitment", statuses: ["requested", "fitment_in_progress", "matched"] },
  { key: "sourcing", label: "Sourcing", statuses: ["rfq_sent", "quoted", "po_issued"] },
  {
    key: "build",
    label: "Payment & build",
    statuses: ["deposit_paid", "in_production", "qc_pending", "qc_passed", "balance_paid"],
  },
  {
    key: "shipping",
    label: "Shipping",
    statuses: ["at_consolidation", "in_transit", "at_port_durban", "at_port_maputo"],
  },
  { key: "clearance", label: "Clearance & road", statuses: ["customs_clearance", "cleared", "in_transit_road"] },
  { key: "delivery", label: "Delivery", statuses: ["delivered", "fit_confirmed", "closed"] },
];

const OUT_OF_BAND: OrderStatus[] = ["on_hold", "disputed", "cancelled"];

export function isOutOfBand(status: OrderStatus): boolean {
  return OUT_OF_BAND.includes(status);
}

/** Index of the phase a status belongs to, or -1 for the out-of-band states. */
export function phaseIndex(status: OrderStatus): number {
  return ORDER_PHASES.findIndex((p) => p.statuses.includes(status));
}
