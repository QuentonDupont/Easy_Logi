import { Check } from "lucide-react";
import type { OrderStatus } from "@easy-logi/shared";
import { ORDER_PHASES, phaseIndex, isOutOfBand, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * The order's position along its six-phase lifecycle: Fitment → Sourcing → Payment & build →
 * Shipping → Clearance & road → Delivery. Out-of-band states (on hold / disputed / cancelled)
 * show a distinct banner instead of a false position on the line.
 */
export function StatusJourney({ status }: { status: OrderStatus }) {
  if (isOutOfBand(status)) {
    const bad = status === "cancelled" || status === "disputed";
    return (
      <div
        className={cn(
          "rounded-lg border p-4 text-sm",
          bad ? "border-destructive/40 bg-destructive/5" : "border-warning/50 bg-warning/10",
        )}
      >
        This order is <strong>{statusLabel(status)}</strong> — off the normal path until an ops admin
        resumes or resolves it.
      </div>
    );
  }

  const current = phaseIndex(status);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-stretch gap-2">
        {ORDER_PHASES.map((p, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <div key={p.key} className="min-w-0 flex-1">
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  state === "todo" ? "bg-border" : "bg-primary",
                  state === "current" && "ring-2 ring-primary/30",
                )}
              />
              <div className="mt-2 flex items-center gap-1">
                {state === "done" && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                <span
                  className={cn(
                    "truncate text-xs",
                    state === "current"
                      ? "font-semibold text-foreground"
                      : state === "done"
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {p.label}
                </span>
              </div>
              {state === "current" && (
                <p className="mt-0.5 truncate text-xs font-medium text-primary">{statusLabel(status)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
