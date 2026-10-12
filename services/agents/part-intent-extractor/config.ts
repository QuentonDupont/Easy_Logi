import type { AgentConfig } from "@easy-logi/agent-runtime";

export const config: AgentConfig = {
  name: "part-intent-extractor",
  modelTier: "haiku",
  triggerEvent: "request.created",
  outputEvent: "request.intent_extracted",
  lowConfidenceEvent: "match.low_confidence",
  confidenceThreshold: 0.55,
  timeoutMs: 10_000,
  maxOutputTokens: 512,
  maxToolCalls: 0, // retrieval happens after this agent, in plain code
  latencyTargetMs: 3_000,
};
