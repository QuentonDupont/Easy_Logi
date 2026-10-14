/** Reconciliation of a shipment plan's cost lines against actuals (import-planner.md §7). Pure. */

export interface PlanLine {
  key: string;
  label: string;
  estimateLowMinor: number;
  estimateHighMinor: number;
  actualMinor?: number | null;
  paidTo?: string;
  paidAt?: string;
}

export type ReconStatus = "pending" | "within" | "over" | "under";

export interface ReconLine extends PlanLine {
  /** actual − midpoint of the estimate band; null when no actual recorded. */
  varianceMinor: number | null;
  status: ReconStatus;
}

export interface Reconciliation {
  lines: ReconLine[];
  totals: {
    estimateLowMinor: number;
    estimateHighMinor: number;
    actualMinor: number;
    /** Sum of the high estimate for lines with no actual yet — i.e. still to pay. */
    remainingMinor: number;
  };
}

function midpoint(l: PlanLine): number {
  return (l.estimateLowMinor + l.estimateHighMinor) / 2;
}

export function reconcile(lines: PlanLine[]): Reconciliation {
  const out: ReconLine[] = lines.map((l) => {
    const hasActual = l.actualMinor != null;
    let status: ReconStatus = "pending";
    let varianceMinor: number | null = null;
    if (hasActual) {
      const a = l.actualMinor as number;
      varianceMinor = Math.round(a - midpoint(l));
      status = a > l.estimateHighMinor ? "over" : a < l.estimateLowMinor ? "under" : "within";
    }
    return { ...l, varianceMinor, status };
  });

  const totals = {
    estimateLowMinor: lines.reduce((s, l) => s + l.estimateLowMinor, 0),
    estimateHighMinor: lines.reduce((s, l) => s + l.estimateHighMinor, 0),
    actualMinor: lines.reduce((s, l) => s + (l.actualMinor ?? 0), 0),
    remainingMinor: lines.reduce((s, l) => s + (l.actualMinor == null ? l.estimateHighMinor : 0), 0),
  };

  return { lines: out, totals };
}
