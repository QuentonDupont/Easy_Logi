import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { runAgent } from "./runAgent";
import type { AgentConfig, CompletionRequest, CompletionResponse, ModelClient } from "./types";

const Output = z.object({
  label: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(280),
});

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

type Scripted = Partial<CompletionResponse> | Error;

function fakeClient(scripted: Scripted[]): { client: ModelClient; calls: CompletionRequest[] } {
  const calls: CompletionRequest[] = [];
  let i = 0;
  const client: ModelClient = {
    async complete(req) {
      calls.push(req);
      const next = scripted[i++];
      if (next instanceof Error) throw next;
      return {
        text: "",
        model: "claude-haiku-5-5",
        tokensIn: 10,
        tokensOut: 5,
        stopReason: "end_turn",
        ...next,
      };
    },
  };
  return { client, calls };
}

// deterministic clock: 0ms then 42ms
function clock() {
  const ticks = [0, 42];
  let i = 0;
  return () => ticks[Math.min(i++, ticks.length - 1)]!;
}

describe("runAgent", () => {
  it("returns ok and the output event on a confident, valid result", async () => {
    const { client } = fakeClient([
      { text: '{"label":"request","confidence":0.95,"reason":"asks for a part"}' },
    ]);
    const res = await runAgent({
      config: CONFIG,
      systemPrompt: "classify",
      outputSchema: Output,
      input: { body: "need a filter" },
      client,
      now: clock(),
    });
    expect(res.outcome).toBe("ok");
    expect(res.emitEvent).toBe("message.classified");
    if (res.outcome === "ok") expect(res.output.label).toBe("request");
    expect(res.log).toMatchObject({
      agent: "message-classifier",
      model: "claude-haiku-5-5",
      tokensIn: 10,
      tokensOut: 5,
      latencyMs: 42,
      toolCalls: 0,
      outcome: "ok",
    });
  });

  it("routes a below-threshold confidence to the human queue", async () => {
    const { client } = fakeClient([
      { text: '{"label":"chatter","confidence":0.4,"reason":"unclear"}' },
    ]);
    const res = await runAgent({
      config: CONFIG,
      systemPrompt: "classify",
      outputSchema: Output,
      input: {},
      client,
    });
    expect(res.outcome).toBe("low_confidence");
    expect(res.emitEvent).toBe("message.classified.needs_human");
  });

  it("retries once on invalid output and succeeds, passing a retry hint", async () => {
    const { client, calls } = fakeClient([
      { text: "not json at all" },
      { text: '{"label":"quote","confidence":0.9,"reason":"price given"}' },
    ]);
    const res = await runAgent({
      config: CONFIG,
      systemPrompt: "classify",
      outputSchema: Output,
      input: {},
      client,
    });
    expect(res.outcome).toBe("ok");
    expect(calls).toHaveLength(2);
    expect(calls[0]!.retryHint).toBeUndefined();
    expect(calls[1]!.retryHint).toContain("not valid JSON");
    // tokens accumulate across both attempts
    expect(res.log.tokensIn).toBe(20);
  });

  it("gives up to the human queue after a failed retry (schema invalid)", async () => {
    const { client, calls } = fakeClient([
      { text: '{"label":"x"}' }, // missing confidence + reason
      { text: '{"label":"x"}' },
    ]);
    const res = await runAgent({
      config: CONFIG,
      systemPrompt: "classify",
      outputSchema: Output,
      input: {},
      client,
    });
    expect(res.outcome).toBe("invalid");
    expect(res.emitEvent).toBe("message.classified.needs_human");
    expect(calls).toHaveLength(2);
    expect(calls[1]!.retryHint).toContain("failed schema validation");
    if (res.outcome === "invalid") expect(res.issues.length).toBeGreaterThan(0);
  });

  it("treats a max_tokens stop as a budget breach (no retry)", async () => {
    const { client, calls } = fakeClient([
      { text: '{"label":"request"', stopReason: "max_tokens" },
    ]);
    const res = await runAgent({
      config: CONFIG,
      systemPrompt: "classify",
      outputSchema: Output,
      input: {},
      client,
    });
    expect(res.outcome).toBe("budget_breach");
    expect(res.emitEvent).toBe("message.classified.needs_human");
    expect(calls).toHaveLength(1); // not retried
  });

  it("maps a thrown client error to the error outcome and human queue", async () => {
    const { client } = fakeClient([new Error("Request timed out")]);
    const res = await runAgent({
      config: CONFIG,
      systemPrompt: "classify",
      outputSchema: Output,
      input: {},
      client,
    });
    expect(res.outcome).toBe("error");
    expect(res.emitEvent).toBe("message.classified.needs_human");
    if (res.outcome === "error") expect(res.error).toContain("timed out");
  });

  it("logs every run and survives a throwing logger", async () => {
    const { client } = fakeClient([
      { text: '{"label":"request","confidence":0.95,"reason":"ok"}' },
    ]);
    const logger = vi.fn(() => {
      throw new Error("db down");
    });
    const res = await runAgent({
      config: CONFIG,
      systemPrompt: "classify",
      outputSchema: Output,
      input: {},
      client,
      logger,
    });
    expect(res.outcome).toBe("ok");
    expect(logger).toHaveBeenCalledOnce();
    expect(logger).toHaveBeenCalledWith(expect.objectContaining({ outcome: "ok" }));
  });

  it("treats a schema without a confidence field as always confident", async () => {
    const NoConfidence = z.object({ language: z.string() });
    const { client } = fakeClient([{ text: '{"language":"zh"}' }]);
    const res = await runAgent({
      config: CONFIG,
      systemPrompt: "translate",
      outputSchema: NoConfidence,
      input: {},
      client,
    });
    expect(res.outcome).toBe("ok");
  });
});
