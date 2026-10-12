import type { AgentConfig } from "@easy-logi/agent-runtime";

export const config: AgentConfig = {
  name: "fitment-ranker",
  modelTier: "sonnet",
  triggerEvent: "candidates.retrieved",
  outputEvent: "fitment.ranked",
  lowConfidenceEvent: "match.low_confidence",
  confidenceThreshold: 0.6,
  timeoutMs: 15_000,
  maxOutputTokens: 1024,
  maxToolCalls: 0, // candidates are retrieved before this agent runs
  latencyTargetMs: 5_000,
};
