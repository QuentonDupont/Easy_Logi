import { percentile } from "@easy-logi/agent-runtime";
import type { AgentRunRow, EventRow } from "@/lib/mock/backend";

/**
 * Ops Health derivations — plain code over the agent_runs + events the pipeline writes. There is
 * no dedicated human-queue table yet, so the "needs human" queue is derived: agent runs whose
 * outcome is not `ok`, plus un-processed `match.low_confidence` / `*.needs_human` events.
 */

const NEEDS_HUMAN_OUTCOMES = new Set(["low_confidence", "invalid", "budget_breach", "error"]);
const NEEDS_HUMAN_EVENTS = new Set(["match.low_confidence"]);

export interface OpsSummary {
  total: number;
  ok: number;
  needsHuman: number;
  byOutcome: Record<string, number>;
  p50LatencyMs: number;
  p95LatencyMs: number;
  tokensIn: number;
  tokensOut: number;
}

export function summarizeAgentRuns(runs: AgentRunRow[]): OpsSummary {
  const byOutcome: Record<string, number> = {};
  const latencies: number[] = [];
  let tokensIn = 0;
  let tokensOut = 0;
  for (const r of runs) {
    byOutcome[r.outcome] = (byOutcome[r.outcome] ?? 0) + 1;
    tokensIn += r.tokens_in ?? 0;
    tokensOut += r.tokens_out ?? 0;
    latencies.push(r.latency_ms ?? 0);
  }
  const ok = byOutcome.ok ?? 0;
  return {
    total: runs.length,
    ok,
    needsHuman: runs.length - ok,
    byOutcome,
    p50LatencyMs: Math.round(percentile(latencies, 50)),
    p95LatencyMs: Math.round(percentile(latencies, 95)),
    tokensIn,
    tokensOut,
  };
}

export function isNeedsHumanRun(r: AgentRunRow): boolean {
  return NEEDS_HUMAN_OUTCOMES.has(r.outcome);
}

export function needsHumanRuns(runs: AgentRunRow[]): AgentRunRow[] {
  return runs.filter(isNeedsHumanRun);
}

export function isNeedsHumanEvent(e: EventRow): boolean {
  return (NEEDS_HUMAN_EVENTS.has(e.name) || e.name.endsWith(".needs_human")) && !e.processed_at;
}

export function needsHumanEvents(events: EventRow[]): EventRow[] {
  return events.filter(isNeedsHumanEvent);
}
