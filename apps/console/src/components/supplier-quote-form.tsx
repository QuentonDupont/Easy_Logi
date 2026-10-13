"use client";

import { useActionState } from "react";
import { submitQuote } from "@/app/quote/[token]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type QuoteFormState = { error?: string };
const INITIAL: QuoteFormState = {};

export function SupplierQuoteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(submitQuote, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="supplierName">Your company</Label>
        <Input id="supplierName" name="supplierName" placeholder="Supplier name" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="unitPrice">Unit price</Label>
          <Input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" placeholder="0.00" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" defaultValue="ZAR" maxLength={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="leadTimeDays">Lead time (days)</Label>
          <Input id="leadTimeDays" name="leadTimeDays" type="number" min="1" placeholder="e.g. 21" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="moq">Minimum order qty</Label>
          <Input id="moq" name="moq" type="number" min="1" placeholder="e.g. 1" />
        </div>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send quote"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
