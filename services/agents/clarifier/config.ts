import type { AgentConfig } from "@easy-logi/agent-runtime";

export const config: AgentConfig = {
  name: "clarifier",
  modelTier: "haiku",
  triggerEvent: "match.low_confidence",
  outputEvent: "clarification.requested",
  lowConfidenceEvent: "match.low_confidence",
  // A question is almost always worth asking; the gate only catches a model that gives up.
  confidenceThreshold: 0.3,
  timeoutMs: 10_000,
  maxOutputTokens: 384,
  maxToolCalls: 0,
  latencyTargetMs: 3_000,
};
