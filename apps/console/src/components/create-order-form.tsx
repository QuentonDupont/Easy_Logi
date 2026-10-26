"use client";

import { useActionState } from "react";
import { createOrder, type ActionState } from "@/app/(app)/orders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INITIAL: ActionState = { ok: false };

export function CreateOrderForm({
  buttonLabel = "New order",
  placeholder = "New order summary (optional)",
}: {
  buttonLabel?: string;
  placeholder?: string;
}) {
  const [state, formAction, pending] = useActionState(createOrder, INITIAL);

  return (
    <form action={formAction} className="flex w-full items-start gap-2 sm:w-auto">
      <div className="flex-1 sm:w-80">
        <Input name="summary" placeholder={placeholder} aria-label="Order summary" />
        {state.error && <p role="alert" className="mt-1 text-xs text-destructive">{state.error}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : buttonLabel}
      </Button>
    </form>
  );
}
