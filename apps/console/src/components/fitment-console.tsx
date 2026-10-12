"use client";

import { useActionState, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { findParts, confirmFit, type FindState } from "@/app/(app)/fitment/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const INITIAL: FindState = { result: null };

const EXAMPLES = [
  "Front brake pads for a 2018 Toyota Hilux 2.8",
  "Oil filter for a Toyota Corolla 1.6",
  "Radiator for a Ford Ranger 3.2",
  "I need a part please",
];

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function FitmentConsole({ offline }: { offline: boolean }) {
  const [state, formAction, pending] = useActionState(findParts, INITIAL);
  const [text, setText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const result = state.result;

  function submitWith(value: string) {
    setText(value);
    // Let React flush the controlled value, then submit.
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form ref={formRef} action={formAction} className="space-y-3">
            <textarea
              name="request"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="e.g. Front brake pads for a 2018 Toyota Hilux 2.8"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => submitWith(ex)}
                    className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <Button type="submit" disabled={pending} className="shrink-0">
                <Search className="mr-2 h-4 w-4" />
                {pending ? "Finding…" : "Find parts"}
              </Button>
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          </form>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          {result.intent && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Understood</CardTitle>
                  <CardDescription>{result.intent.reason}</CardDescription>
                </div>
                <Badge variant={result.intent.confidence >= 0.6 ? "success" : "warning"}>
                  {pct(result.intent.confidence)} confident
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-xs">
                <Field label="Make" value={result.intent.make} />
                <Field label="Model" value={result.intent.model} />
                <Field label="Year" value={result.intent.year ? String(result.intent.year) : null} />
                <Field label="Category" value={result.intent.category} />
                <Field label="Position" value={result.intent.position} />
              </CardContent>
            </Card>
          )}

          {result.clarification && (
            <Card className="border-amber-300/60">
              <CardHeader>
                <CardTitle className="text-base">One quick question</CardTitle>
                <CardDescription>{result.clarification.question}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result.clarification.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => submitWith(`${result.requestText} — ${o.value}`)}
                    className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
                  >
                    {o.label}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Candidate parts {result.candidates.length > 0 && `(${result.candidates.length})`}
              </CardTitle>
              <CardDescription>
                Ranked by fit. Confirm one to create an order and approve the part number.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No catalogue part matched confidently. Answer the question above to narrow it down.
                </p>
              ) : (
                result.candidates.map((c) => (
                  <div
                    key={c.partId}
                    className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{c.partNumber}</span>
                        <Badge variant="secondary">{c.brand}</Badge>
                        <Badge variant={c.score >= 0.6 ? "success" : "warning"}>{pct(c.score)} fit</Badge>
                      </div>
                      <p className="truncate text-sm">{c.description}</p>
                      <p className="text-xs text-muted-foreground">{c.reason}</p>
                    </div>
                    <form action={confirmFit} className="shrink-0">
                      <input type="hidden" name="partId" value={c.partId} />
                      <input type="hidden" name="partNumber" value={c.partNumber} />
                      <input type="hidden" name="brand" value={c.brand} />
                      <input type="hidden" name="description" value={c.description} />
                      <input type="hidden" name="request" value={result.requestText} />
                      <input type="hidden" name="runs" value={JSON.stringify(result.runs)} />
                      <Button type="submit" size="sm">
                        Confirm fit
                      </Button>
                    </form>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Agent runs</CardTitle>
                <CardDescription>Every model call in this pipeline, logged.</CardDescription>
              </div>
              <Badge variant="secondary">
                <Sparkles className="mr-1 h-3 w-3" />
                {offline ? "offline model" : "Claude"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-1">
              {result.runs.map((r, i) => (
                <div
                  key={`${r.agent}-${i}`}
                  className="flex items-center justify-between gap-3 border-b py-1 text-xs last:border-b-0"
                >
                  <span className="font-medium">{r.agent}</span>
                  <span className="text-muted-foreground">{r.model}</span>
                  <Badge variant={r.outcome === "ok" ? "success" : "warning"}>{r.outcome}</Badge>
                  <span className="text-muted-foreground">{r.latencyMs}ms</span>
                  <span className="text-muted-foreground">
                    {r.tokensIn}→{r.tokensOut} tok
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value ?? "—"}</span>
    </span>
  );
}
