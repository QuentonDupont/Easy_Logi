import type { AgentConfig } from "@easy-logi/agent-runtime";

export const config: AgentConfig = {
  name: "part-label-reader",
  modelTier: "sonnet", // vision judgment -> Sonnet-class
  triggerEvent: "request.photo_added",
  outputEvent: "request.label_read",
  lowConfidenceEvent: "match.low_confidence",
  confidenceThreshold: 0.5,
  timeoutMs: 15_000,
  maxOutputTokens: 512,
  maxToolCalls: 0,
  latencyTargetMs: 5_000,
};
