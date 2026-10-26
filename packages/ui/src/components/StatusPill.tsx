import * as React from "react";
import { type OrderStatus } from "@easy-logi/shared";
import { cn } from "../lib/cn";

/**
 * The five pill tones (Manifest §3). A status without a tone is a type error,
 * because STATUS_PILL_TONE is declared `Record<OrderStatus, PillTone>` — adding a
 * status to ORDER_STATUSES without a colour fails `pnpm typecheck`.
 */
export type PillTone = "action" | "neutral" | "transit" | "cleared" | "dispute";

export const STATUS_PILL_TONE: Record<OrderStatus, PillTone> = {
  // fitment
  requested: "neutral",
  fitment_in_progress: "neutral",
  matched: "action", // part approved — awaiting RFQ decision
  // sourcing + supplier comms
  rfq_sent: "neutral",
  quoted: "action", // awaiting PO
  po_issued: "neutral",
  deposit_paid: "neutral",
  in_production: "neutral",
  qc_pending: "action", // review QC photos
  qc_passed: "neutral",
  balance_paid: "neutral",
  // logistics
  at_consolidation: "neutral",
  in_transit: "transit",
  at_port_durban: "transit",
  at_port_maputo: "transit",
  customs_clearance: "transit",
  cleared: "cleared",
  in_transit_road: "transit",
  delivered: "cleared",
  // post-delivery
  fit_confirmed: "cleared",
  closed: "cleared",
  // out of band
  on_hold: "action", // paused — needs resolution
  disputed: "dispute",
  cancelled: "dispute",
};

const TONE_CLASS: Record<PillTone, string> = {
  action: "bg-primary text-primary-foreground",
  neutral: "bg-border-soft text-foreground",
  transit: "bg-transit text-transit-foreground",
  cleared: "bg-success text-success-foreground",
  // The Manifest palette has no red; a disputed/cancelled order reads as "out of band"
  // in the dark ink pill (white on ink = ~15:1). See docs/decisions.md (2026-10-14).
  dispute: "bg-ink text-white",
};

/** Title Case label derived from a snake_case status (e.g. `at_port_durban` → `At Port Durban`). */
export function statusLabel(status: OrderStatus): string {
  const acronyms: Record<string, string> = { po: "PO", rfq: "RFQ", qc: "QC" };
  return status
    .split("_")
    .map((w) => acronyms[w] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: OrderStatus;
  /** Override the derived label (e.g. "At port · Durban"). */
  label?: string;
}

export function StatusPill({ status, label, className, ...props }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-semibold",
        TONE_CLASS[STATUS_PILL_TONE[status]],
        className,
      )}
      {...props}
    >
      {label ?? statusLabel(status)}
    </span>
  );
}
