import { describe, it, expect } from "vitest";
import { summarizeAgentRuns, needsHumanRuns, needsHumanEvents } from "./health";
import type { AgentRunRow, EventRow } from "@/lib/mock/backend";

function run(outcome: string, latency: number, tokensIn = 10, tokensOut = 5): AgentRunRow {
  return {
    id: "x",
    order_id: null,
    agent: "a",
    model: "m",
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    latency_ms: latency,
    tool_calls: 0,
    outcome,
    error: null,
    created_at: "2026-10-13T00:00:00Z",
  };
}

function ev(name: string, processed: string | null): EventRow {
  return { id: "e", org_id: "o", name, order_id: null, payload: {}, dedupe_key: null, processed_at: processed, created_at: "t" };
}

describe("summarizeAgentRuns", () => {
  it("counts outcomes, needs-human, tokens and latency percentiles", () => {
    const s = summarizeAgentRuns([run("ok", 4), run("ok", 6), run("low_confidence", 12), run("error", 20)]);
    expect(s.total).toBe(4);
    expect(s.ok).toBe(2);
    expect(s.needsHuman).toBe(2);
    expect(s.byOutcome).toMatchObject({ ok: 2, low_confidence: 1, error: 1 });
    expect(s.tokensIn).toBe(40);
    expect(s.tokensOut).toBe(20);
    expect(s.p95LatencyMs).toBeGreaterThanOrEqual(s.p50LatencyMs);
  });

  it("handles an empty set without dividing by zero", () => {
    const s = summarizeAgentRuns([]);
    expect(s.total).toBe(0);
    expect(s.needsHuman).toBe(0);
    expect(s.p50LatencyMs).toBe(0);
  });
});

describe("needs-human derivation", () => {
  it("selects non-ok runs", () => {
    const runs = [run("ok", 1), run("low_confidence", 1), run("budget_breach", 1), run("invalid", 1)];
    expect(needsHumanRuns(runs).map((r) => r.outcome)).toEqual(["low_confidence", "budget_breach", "invalid"]);
  });

  it("selects only un-processed needs-human events", () => {
    const events = [
      ev("order.created", "2026"),
      ev("match.low_confidence", null),
      ev("match.low_confidence", "2026"),
      ev("rfq.needs_human", null),
    ];
    expect(needsHumanEvents(events).map((e) => e.name)).toEqual(["match.low_confidence", "rfq.needs_human"]);
  });
});
