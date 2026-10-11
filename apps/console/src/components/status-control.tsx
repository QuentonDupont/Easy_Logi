"use client";

import { useActionState } from "react";
import type { OrderStatus } from "@easy-logi/shared";
import { changeStatus, type ActionState } from "@/app/(app)/orders/actions";
import { statusLabel } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL: ActionState = { ok: false };

export function StatusControl({
  orderId,
  options,
}: {
  orderId: string;
  options: OrderStatus[];
}) {
  const [state, formAction, pending] = useActionState(changeStatus, INITIAL);

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No status changes are available to you from here.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="space-y-2">
        <Label htmlFor="to">Move to</Label>
        <Select id="to" name="to" defaultValue={options[0]}>
          {options.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" name="note" placeholder="Why this change?" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update status"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">Status updated.</p>}
    </form>
  );
}
