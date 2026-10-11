export const config = {
  name: "<agent-name>",
  modelTier: "haiku" as "haiku" | "sonnet",
  triggerEvent: "<event.name>",
  outputEvent: "<event.name>",
  lowConfidenceEvent: "<event.name>.needs_human",
  confidenceThreshold: 0.85,
  timeoutMs: 10_000,
  maxOutputTokens: 512,
  maxToolCalls: 0, // never more than 2
  latencyTargetMs: 3_000,
};
