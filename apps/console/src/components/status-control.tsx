"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import type { OrderStatus } from "@easy-logi/shared";
import { changeStatus, type ActionState } from "@/app/(app)/orders/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL: ActionState = { ok: false };

export type ChecklistEntry = {
  key: string;
  label: string;
  present: boolean;
  uploader: "customer" | "easylogi";
};

/** One possible next status, with the documents the move needs and what the next step brings. */
export type MoveOption = {
  to: OrderStatus;
  label: string;
  /** Forward moves (incl. resuming a paused order to a later step) are document-gated. */
  gated: boolean;
  /** Required documents for THIS move, with what's on file. */
  checklist: ChecklistEntry[];
  nextSummary: string;
  nextNeeds: string[];
  nextDownloads: string[];
};

const OUT_OF_BAND_NOTE: Partial<Record<OrderStatus, string>> = {
  disputed: "This raises a dispute with Easy Logi about this order.",
  on_hold: "This pauses the order. Resuming later still needs the documents for the step it was paused at.",
  cancelled: "This cancels the order. It can't be undone.",
};

export function StatusControl({
  orderId,
  currentLabel,
  options,
  isOps,
}: {
  orderId: string;
  currentLabel: string;
  options: MoveOption[];
  isOps: boolean;
}) {
  const [state, formAction, pending] = useActionState(changeStatus, INITIAL);
  // No default: the user always picks the move deliberately (a one-click dispute is too easy).
  const [selected, setSelected] = useState<OrderStatus | "">("");
  const [override, setOverride] = useState(false);
  const [attempted, setAttempted] = useState<string>("");

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No status changes are available to you from here — Easy Logi moves this order on for you.
      </p>
    );
  }

  const option = options.find((o) => o.to === selected);
  const missing = option?.checklist.filter((c) => !c.present) ?? [];
  const blocked = !!option && option.gated && missing.length > 0;
  const canSubmit = !!option && (!blocked || (isOps && override));
  const helpId = "status-help";

  return (
    <form action={formAction} onSubmit={() => setAttempted(selected)} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="space-y-2">
        <Label htmlFor="to">Move to</Label>
        <Select
          id="to"
          name="to"
          value={selected}
          required
          onChange={(e) => {
            setSelected(e.target.value as OrderStatus);
            setOverride(false);
          }}
        >
          <option value="" disabled>
            Choose the next step…
          </option>
          {options.map((o) => (
            <option key={o.to} value={o.to}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {option && (
        <>
          {/* Documents this move needs */}
          <section aria-labelledby="exit-docs" className="space-y-2 rounded-md border p-3">
            <h3 id="exit-docs" className="text-sm font-semibold">
              Before leaving “{currentLabel}”
            </h3>
            {!option.gated ? (
              <p className="text-xs text-muted-foreground">
                No documents are needed for this move. {OUT_OF_BAND_NOTE[option.to] ?? ""}
              </p>
            ) : option.checklist.length === 0 ? (
              <p className="text-xs text-muted-foreground">No documents are required for this move.</p>
            ) : (
              <>
                <ul className="list-none space-y-1 p-0">
                  {option.checklist.map((c) => (
                    <li key={c.key} className="flex items-start gap-2 text-xs">
                      {c.present ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                      ) : (
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      )}
                      <span>
                        <span className="sr-only">{c.present ? "On file: " : "Missing: "}</span>
                        {c.label}
                        {!c.present && c.uploader === "easylogi" && (
                          <span className="text-muted-foreground"> — Easy Logi adds this</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                {missing.length === 0 ? (
                  <p className="text-xs font-medium text-success">All required documents are in.</p>
                ) : (
                  <p id={helpId} className="text-xs font-medium text-primary">
                    Upload the missing {missing.length === 1 ? "document" : "documents"} in “Documents for this step”
                    before moving on.
                  </p>
                )}
              </>
            )}

            {blocked && isOps && (
              <div className="space-y-2 border-t pt-2">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
                  Override the missing documents (staff only)
                </label>
                {override && (
                  <div className="space-y-1">
                    <Label htmlFor="overrideReason">Reason (kept in the order history)</Label>
                    <Input
                      id="overrideReason"
                      name="overrideReason"
                      required
                      minLength={5}
                      placeholder="e.g. Seller emailed the pro forma; uploading tomorrow"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* What the next step brings */}
          <section aria-labelledby="next-step" className="space-y-1 rounded-md bg-secondary p-3 text-xs">
            <h3 id="next-step" className="flex items-center gap-1.5 text-sm font-semibold">
              <ArrowRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Next: {option.label}
            </h3>
            <p>{option.nextSummary}</p>
            {option.nextNeeds.length > 0 && (
              <p>
                <span className="font-medium">That step will need:</span> {option.nextNeeds.join("; ")}.
              </p>
            )}
            {option.nextDownloads.length > 0 && (
              <p>
                <span className="font-medium">Easy Logi will prepare:</span> {option.nextDownloads.join(", ")}.
              </p>
            )}
          </section>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" name="note" placeholder="Why this change?" />
      </div>

      <Button
        type="submit"
        disabled={pending || !canSubmit}
        aria-describedby={blocked && !override ? helpId : undefined}
      >
        {pending ? "Updating…" : blocked && override ? "Override and update status" : "Update status"}
      </Button>
      {blocked && !isOps && (
        <p className="text-xs text-muted-foreground">This move unlocks once the required documents are uploaded.</p>
      )}
      {state.error && attempted === selected && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && attempted === selected && (
        <p role="status" className="text-sm text-success">
          Status updated.
        </p>
      )}
    </form>
  );
}
