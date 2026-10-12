"use client";

import { useActionState, useRef, useState } from "react";
import { Search, Sparkles, Camera, ScanLine } from "lucide-react";
import { findParts, readPhoto, confirmFit, type FindState } from "@/app/(app)/fitment/actions";
import { LABEL_SAMPLES } from "@/lib/fitment/offline";
import type { FitmentResult } from "@/lib/fitment/types";
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
  const [textState, textAction, textPending] = useActionState(findParts, INITIAL);
  const [photoState, photoAction, photoPending] = useActionState(readPhoto, INITIAL);

  const [text, setText] = useState("");
  const [sampleId, setSampleId] = useState("");
  const textFormRef = useRef<HTMLFormElement>(null);
  const photoFormRef = useRef<HTMLFormElement>(null);

  // Show whichever of the text / photo searches ran most recently.
  const latest = (photoState.ts ?? 0) >= (textState.ts ?? 0) ? photoState : textState;
  const result = latest.result;
  const error = latest.error;

  function submitText(value: string) {
    setText(value);
    requestAnimationFrame(() => textFormRef.current?.requestSubmit());
  }
  function submitSample(id: string) {
    setSampleId(id);
    requestAnimationFrame(() => photoFormRef.current?.requestSubmit());
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Text request */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" /> Describe the part
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form ref={textFormRef} action={textAction} className="space-y-3">
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
                      onClick={() => submitText(ex)}
                      className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <Button type="submit" disabled={textPending} size="sm" className="shrink-0">
                  {textPending ? "Finding…" : "Find parts"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Photo request */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-4 w-4" /> Read a part photo
            </CardTitle>
            <CardDescription>
              {offline
                ? "No API key — pick a sample label below. (Set ANTHROPIC_API_KEY to read a real uploaded photo with Sonnet vision.)"
                : "Upload a photo of the part or its box — Sonnet vision reads the part number."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={photoFormRef} action={photoAction} className="space-y-3">
              <input type="hidden" name="sampleId" value={sampleId} />
              <input
                type="file"
                name="photo"
                accept="image/*"
                onChange={() => setSampleId("")}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm hover:file:bg-muted"
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {LABEL_SAMPLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => submitSample(s.id)}
                      className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <Button
                  type="submit"
                  disabled={photoPending}
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => setSampleId("")}
                >
                  <ScanLine className="mr-2 h-4 w-4" />
                  {photoPending ? "Reading…" : "Read photo"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && <ResultView result={result} offline={offline} />}
    </div>
  );
}

function ResultView({ result, offline }: { result: FitmentResult; offline: boolean }) {
  return (
    <div className="space-y-6">
      {result.labelRead && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Read from photo</CardTitle>
              <CardDescription>{result.labelRead.reason}</CardDescription>
            </div>
            <Badge variant={result.labelRead.confidence >= 0.5 ? "success" : "warning"}>
              {pct(result.labelRead.confidence)} legible
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-xs">
            <Field label="Brand" value={result.labelRead.brand} />
            {result.labelRead.numbers.map((n) => (
              <span key={n} className="rounded-md border px-2 py-1 font-mono font-medium">
                {n}
              </span>
            ))}
            {result.labelRead.text && <Field label="Text" value={result.labelRead.text} />}
          </CardContent>
        </Card>
      )}

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
              <span key={o.value} className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
                {o.label}
              </span>
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
