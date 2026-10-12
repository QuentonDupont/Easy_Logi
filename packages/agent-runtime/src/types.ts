import type { z } from "zod";

/** Model tiers available to runtime agents (CLAUDE.md "Agent rules" / agent-roster). */
export type ModelTier = "haiku" | "sonnet";

/**
 * The static config each agent folder ships in `config.ts`. Mirrors
 * services/agents/_template/config.ts. Budgets are hard limits; a breach routes to the
 * human queue.
 */
export interface AgentConfig {
  name: string;
  modelTier: ModelTier;
  triggerEvent: string;
  /** Event emitted on a confident, valid result. */
  outputEvent: string;
  /** Event emitted on low confidence, a budget breach, or an invalid output (human queue). */
  lowConfidenceEvent: string;
  /** Results with confidence below this go to the human queue. */
  confidenceThreshold: number;
  timeoutMs: number;
  maxOutputTokens: number;
  /** Never more than 2. Phase 1 agents use 0 (retrieval happens before the agent runs). */
  maxToolCalls: number;
  latencyTargetMs: number;
}

/** An image attached to a completion request (for vision agents). Base64, no data: prefix. */
export interface ImageInput {
  /** e.g. "image/jpeg", "image/png", "image/webp". */
  mediaType: string;
  /** Base64-encoded image bytes, with no newlines and no data: URL prefix. */
  dataBase64: string;
}

/** A single model completion request. Static instructions are cached; input is untrusted data. */
export interface CompletionRequest {
  model: string;
  /** Static system instructions (prompt-cached). */
  system: string;
  /** The input payload as a JSON string. Treated as data, never instructions. */
  userJson: string;
  /** Images to show the model (vision agents only); untrusted data, same as text input. */
  images?: ImageInput[];
  maxTokens: number;
  timeoutMs: number;
  modelTier: ModelTier;
  /** Appended on the single retry to tell the model how its previous output failed validation. */
  retryHint?: string;
}

export interface CompletionResponse {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  /** Raw stop reason from the API; "max_tokens" means the output was truncated. */
  stopReason: string | null;
}

/** The port the runtime calls. The real adapter wraps the Anthropic SDK; tests inject a fake. */
export interface ModelClient {
  complete(req: CompletionRequest): Promise<CompletionResponse>;
}

export type AgentOutcome = "ok" | "low_confidence" | "invalid" | "budget_breach" | "error";

/** One row written to the `agent_runs` table for every run (CLAUDE.md "Agent rules"). */
export interface AgentRunLog {
  agent: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  toolCalls: number;
  outcome: AgentOutcome;
  error: string | null;
}

export type AgentRunResult<T> =
  | { outcome: "ok"; output: T; emitEvent: string; log: AgentRunLog }
  | { outcome: "low_confidence"; output: T; emitEvent: string; log: AgentRunLog }
  | { outcome: "invalid"; emitEvent: string; issues: z.ZodIssue[]; log: AgentRunLog }
  | { outcome: "budget_breach"; emitEvent: string; reason: string; log: AgentRunLog }
  | { outcome: "error"; emitEvent: string; error: string; log: AgentRunLog };

export interface RunAgentParams<T> {
  config: AgentConfig;
  /** The agent's prompt.md contents (static instructions). */
  systemPrompt: string;
  /** The ONLY output this agent produces (its schema.ts export). */
  outputSchema: z.ZodType<T>;
  /** The retrieved context / event payload to classify, extract from, or rank. */
  input: unknown;
  /** Images to show the model (vision agents only). */
  images?: ImageInput[];
  client: ModelClient;
  /** Injectable clock for latency measurement (tests pass a deterministic one). */
  now?: () => number;
  /** Persist the run log (writes to agent_runs). Failures here never fail the run. */
  logger?: (log: AgentRunLog) => void | Promise<void>;
}
