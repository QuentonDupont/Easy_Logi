import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  percentile,
  evaluateExpectation,
  parseEvalJsonl,
  runEvalSet,
  type EvalCase,
} from "./evalRunner";
import type { AgentConfig, ModelClient } from "./types";

describe("percentile", () => {
  it("uses nearest-rank and handles edges", () => {
    const v = [10, 20, 30, 40, 50];
    expect(percentile(v, 50)).toBe(30);
    expect(percentile(v, 95)).toBe(50);
    expect(percentile(v, 0)).toBe(10);
    expect(percentile([], 50)).toBe(0);
    expect(percentile([7], 95)).toBe(7);
  });
});

describe("evaluateExpectation", () => {
  it("passes field equality", () => {
    expect(evaluateExpectation({ label: "request" }, "ok", { label: "request" }).pass).toBe(true);
  });

  it("fails and explains a field mismatch", () => {
    const r = evaluateExpectation({ label: "request" }, "ok", { label: "chatter" });
    expect(r.pass).toBe(false);
    expect(r.reasons[0]).toContain("label");
  });

  it("checks the outcome key", () => {
    expect(evaluateExpectation({ outcome: "low_confidence" }, "low_confidence", {}).pass).toBe(true);
    expect(evaluateExpectation({ outcome: "ok" }, "invalid", undefined).pass).toBe(false);
  });

  it("checks confidence bounds", () => {
    expect(evaluateExpectation({ confidence_below: 0.7 }, "ok", { confidence: 0.4 }).pass).toBe(true);
    expect(evaluateExpectation({ confidence_below: 0.7 }, "ok", { confidence: 0.9 }).pass).toBe(false);
    expect(evaluateExpectation({ confidence_above: 0.8 }, "ok", { confidence: 0.9 }).pass).toBe(true);
  });

  it("fails confidence checks when there is no output", () => {
    expect(evaluateExpectation({ confidence_below: 0.7 }, "invalid", undefined).pass).toBe(false);
  });
});

describe("parseEvalJsonl", () => {
  it("parses non-blank lines and defaults input", () => {
    const cases = parseEvalJsonl(
      '{"id":"c1","input":{"a":1},"expect":{"label":"x"}}\n\n{"id":"c2","expect":{"outcome":"ok"}}\n',
    );
    expect(cases).toHaveLength(2);
    expect(cases[1]!.input).toEqual({});
  });

  it("throws on a case missing id or expect", () => {
    expect(() => parseEvalJsonl('{"input":{}}')).toThrow();
    expect(() => parseEvalJsonl('{"id":"c1"}')).toThrow();
  });
});

const Output = z.object({ label: z.string(), confidence: z.number(), reason: z.string() });

const CONFIG: AgentConfig = {
  name: "message-classifier",
  modelTier: "haiku",
  triggerEvent: "message.received",
  outputEvent: "message.classified",
  lowConfidenceEvent: "message.classified.needs_human",
  confidenceThreshold: 0.85,
  timeoutMs: 10_000,
  maxOutputTokens: 512,
  maxToolCalls: 0,
  latencyTargetMs: 2_000,
};

/** Returns a scripted text per case id. */
function scriptedClient(byId: Record<string, string>): ModelClient {
  let current = "";
  return {
    async complete(req) {
      // The input JSON carries the case input; map via a marker we set in the test cases.
      const parsed = JSON.parse(req.userJson) as { id?: string };
      current = parsed.id ? (byId[parsed.id] ?? "") : "";
      return {
        text: current,
        model: "claude-haiku-5-5",
        tokensIn: 10,
        tokensOut: 4,
        stopReason: "end_turn",
      };
    },
  };
}

describe("runEvalSet", () => {
  const cases: EvalCase[] = [
    { id: "c1", input: { id: "c1" }, expect: { label: "request" } },
    { id: "c2", input: { id: "c2" }, expect: { confidence_below: 0.7 } },
    { id: "c3", input: { id: "c3" }, expect: { label: "quote" } },
  ];

  it("scores a mixed set and aggregates accuracy, latency and tokens", async () => {
    const client = scriptedClient({
      c1: '{"label":"request","confidence":0.95,"reason":"ok"}', // pass
      c2: '{"label":"chatter","confidence":0.4,"reason":"unclear"}', // pass (0.4 < 0.7)
      c3: '{"label":"request","confidence":0.9,"reason":"wrong"}', // fail (expected quote)
    });
    const report = await runEvalSet({
      config: CONFIG,
      systemPrompt: "classify",
      outputSchema: Output,
      cases,
      client,
      previousAccuracy: 0.5,
    });

    expect(report.total).toBe(3);
    expect(report.passed).toBe(2);
    expect(report.accuracy).toBeCloseTo(2 / 3);
    expect(report.avgTokensIn).toBe(10);
    expect(report.avgTokensOut).toBe(4);
    expect(report.regression).toBe(false); // 0.667 >= 0.5
    expect(report.cases.find((c) => c.id === "c3")!.pass).toBe(false);
  });

  it("flags a regression when accuracy drops below the previous run", async () => {
    const client = scriptedClient({
      c1: "not json",
      c2: "not json",
      c3: "not json",
    });
    const report = await runEvalSet({
      config: CONFIG,
      systemPrompt: "classify",
      outputSchema: Output,
      cases,
      client,
      previousAccuracy: 0.9,
    });
    expect(report.passed).toBe(0);
    expect(report.regression).toBe(true);
  });
});
