"use client";

import { useActionState, useRef, useState } from "react";
import { Search, CheckCircle2 } from "lucide-react";
import { findMyPart, submitRequest } from "@/app/request/actions";
import { INITIAL_BUYER } from "@/app/request/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const EXAMPLES = [
  "Front brake pads for my 2018 Toyota Hilux",
  "Oil filter for a Toyota Corolla 1.6",
  "Radiator for a Ford Ranger 3.2",
];

export function BuyerRequest() {
  const [state, action, pending] = useActionState(findMyPart, INITIAL_BUYER);
  const [text, setText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function runWith(value: string) {
    setText(value);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  const result = state.result;
  const candidates = result?.candidates ?? [];
  const top = candidates[0];
  const others = candidates.slice(1, 3);

  return (
    <div className="space-y-6">
      <form ref={formRef} action={action} className="space-y-3">
        <textarea
          name="request"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="e.g. Front brake pads for my 2018 Toyota Hilux 2.8"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
          <Search className="mr-2 h-4 w-4" />
          {pending ? "Looking…" : "Find my part"}
        </Button>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => runWith(ex)}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {ex}
            </button>
          ))}
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      </form>

      {result && top && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              We can source this
            </CardTitle>
            <CardDescription>Confirm and we&apos;ll start sourcing it for you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Candidate
              requestText={result.requestText}
              partNumber={top.partNumber}
              description={top.description}
              brand={top.brand}
              primary
            />
            {others.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm text-muted-foreground">Or one of these:</p>
                {others.map((c) => (
                  <Candidate
                    key={c.partId}
                    requestText={result.requestText}
                    partNumber={c.partNumber}
                    description={c.description}
                    brand={c.brand}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && !top && result.clarification && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="text-base">Just one question</CardTitle>
            <CardDescription>{result.clarification.question}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {result.clarification.options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => runWith(`${result.requestText} — ${o.value}`)}
                className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
              >
                {o.label}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {result && !top && !result.clarification && (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t match that yet. Add the make, model and year, or try describing the part
          differently.
        </p>
      )}
    </div>
  );
}

function Candidate({
  requestText,
  partNumber,
  description,
  brand,
  primary = false,
}: {
  requestText: string;
  partNumber: string;
  description: string;
  brand: string;
  primary?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium">{description}</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{partNumber}</span>
          <Badge variant="secondary">{brand}</Badge>
        </div>
      </div>
      <form action={submitRequest} className="shrink-0">
        <input type="hidden" name="request" value={requestText} />
        <input type="hidden" name="partNumber" value={partNumber} />
        <input type="hidden" name="description" value={description} />
        <Button type="submit" variant={primary ? "default" : "outline"} size="sm">
          Request this part
        </Button>
      </form>
    </div>
  );
}
