import type { z } from "zod";
import { runAgent } from "./runAgent";
import type { AgentConfig, ModelClient } from "./types";

/**
 * Eval harness core. Runs an agent's JSONL golden set through `runAgent` and scores each case,
 * then aggregates accuracy, latency percentiles and token usage. Pure and client-injected so it
 * is unit-tested with a fake; the `pnpm eval <agent>` CLI (scripts/eval.ts) wires the real agent
 * folder and model client to it.
 */

/** One line of an agent's evals/*.jsonl file. */
export interface EvalCase {
  id: string;
  input: unknown;
  /**
   * Expectations. Special keys:
   *  - `outcome`: expected run outcome ("ok" | "low_confidence" | "invalid" | ...)
   *  - `confidence_below` / `confidence_above`: bound on the output's `confidence`
   * Any other key is compared for equality against the output field of the same name.
   */
  expect: Record<string, unknown>;
  note?: string;
}

export interface CaseResult {
  id: string;
  pass: boolean;
  reasons: string[];
  outcome: string;
  latencyMs: number;
  note?: string;
}

export interface EvalReport {
  agent: string;
  total: number;
  passed: number;
  accuracy: number; // 0..1
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgTokensIn: number;
  avgTokensOut: number;
  cases: CaseResult[];
  previousAccuracy?: number;
  /** True when accuracy dropped vs the previous run. */
  regression: boolean;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  // nearest-rank method
  const rank = Math.ceil((p / 100) * sorted.length);
  const idx = Math.min(Math.max(rank - 1, 0), sorted.length - 1);
  return sorted[idx]!;
}

function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Score one run against a case's expectations. Returns pass + the specific reasons any check
 * failed (so the CLI can print actionable diffs).
 */
export function evaluateExpectation(
  expect: Record<string, unknown>,
  outcome: string,
  output: Record<string, unknown> | undefined,
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];

  for (const [key, expected] of Object.entries(expect)) {
    if (key === "outcome") {
      if (outcome !== expected) reasons.push(`outcome: expected ${String(expected)}, got ${outcome}`);
      continue;
    }
    if (key === "confidence_below" || key === "confidence_above") {
      const conf = output?.confidence;
      if (typeof conf !== "number") {
        reasons.push(`${key}: no numeric confidence in output (outcome ${outcome})`);
        continue;
      }
      const bound = expected as number;
      if (key === "confidence_below" && !(conf < bound)) {
        reasons.push(`confidence_below: expected < ${bound}, got ${conf}`);
      }
      if (key === "confidence_above" && !(conf > bound)) {
        reasons.push(`confidence_above: expected > ${bound}, got ${conf}`);
      }
      continue;
    }
    // Field equality against the output.
    if (!output) {
      reasons.push(`${key}: no output to compare (outcome ${outcome})`);
      continue;
    }
    if (!equal(output[key], expected)) {
      reasons.push(
        `${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(output[key])}`,
      );
    }
  }

  return { pass: reasons.length === 0, reasons };
}

export interface RunEvalSetParams<T> {
  config: AgentConfig;
  systemPrompt: string;
  outputSchema: z.ZodType<T>;
  cases: EvalCase[];
  client: ModelClient;
  now?: () => number;
  /** Accuracy from the previous run (evals/last-result.json) to flag regressions. */
  previousAccuracy?: number;
}

export async function runEvalSet<T>(params: RunEvalSetParams<T>): Promise<EvalReport> {
  const { config, systemPrompt, outputSchema, cases, client } = params;
  const caseResults: CaseResult[] = [];
  const latencies: number[] = [];
  let tokensIn = 0;
  let tokensOut = 0;

  for (const c of cases) {
    const result = await runAgent({
      config,
      systemPrompt,
      outputSchema,
      input: c.input,
      client,
      now: params.now,
    });

    const output =
      result.outcome === "ok" || result.outcome === "low_confidence"
        ? (result.output as Record<string, unknown>)
        : undefined;

    const { pass, reasons } = evaluateExpectation(c.expect, result.outcome, output);

    latencies.push(result.log.latencyMs);
    tokensIn += result.log.tokensIn;
    tokensOut += result.log.tokensOut;

    caseResults.push({
      id: c.id,
      pass,
      reasons,
      outcome: result.outcome,
      latencyMs: result.log.latencyMs,
      note: c.note,
    });
  }

  const total = cases.length;
  const passed = caseResults.filter((r) => r.pass).length;
  const accuracy = total === 0 ? 0 : passed / total;
  const regression =
    params.previousAccuracy !== undefined && accuracy < params.previousAccuracy;

  return {
    agent: config.name,
    total,
    passed,
    accuracy,
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    avgTokensIn: total === 0 ? 0 : Math.round(tokensIn / total),
    avgTokensOut: total === 0 ? 0 : Math.round(tokensOut / total),
    cases: caseResults,
    previousAccuracy: params.previousAccuracy,
    regression,
  };
}

/** Parse the lines of a JSONL eval file into cases (ignores blank lines). */
export function parseEvalJsonl(text: string): EvalCase[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line, i) => {
      const obj = JSON.parse(line) as Partial<EvalCase>;
      if (!obj.id) throw new Error(`eval case on line ${i + 1} is missing "id"`);
      if (!obj.expect) throw new Error(`eval case "${obj.id}" is missing "expect"`);
      return { id: obj.id, input: obj.input ?? {}, expect: obj.expect, note: obj.note };
    });
}
