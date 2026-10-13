import type { z } from "zod";
import { resolveModel } from "./models";
import { extractJson } from "./json";
import type {
  AgentRunLog,
  AgentRunResult,
  CompletionResponse,
  RunAgentParams,
} from "./types";

function readConfidence(value: unknown): number | undefined {
  if (value && typeof value === "object" && "confidence" in value) {
    const c = (value as Record<string, unknown>).confidence;
    if (typeof c === "number") return c;
  }
  return undefined;
}

function summariseIssues(issues: z.ZodIssue[]): string {
  return issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

/**
 * Run one agent: call the model, parse+validate its JSON against the agent's schema, allow a
 * single retry on invalid output, enforce confidence and output-budget limits, and log the run.
 * Deterministic logic lives in plain code elsewhere — this only wraps the one model call an agent
 * makes. Every exit routes to exactly one event: the output event on success, or the
 * low-confidence/human-queue event on low confidence, a budget breach, or invalid output.
 */
export async function runAgent<T>(params: RunAgentParams<T>): Promise<AgentRunResult<T>> {
  const { config, systemPrompt, outputSchema, input, client } = params;
  const now = params.now ?? (() => Date.now());
  const model = resolveModel(config.modelTier);
  const start = now();

  let tokensIn = 0;
  let tokensOut = 0;

  const finish = (
    outcome: AgentRunLog["outcome"],
    error: string | null,
  ): AgentRunLog => ({
    agent: config.name,
    model,
    tokensIn,
    tokensOut,
    latencyMs: now() - start,
    toolCalls: 0, // Phase 1 agents run with retrieval done up front; no tool loop here.
    outcome,
    error,
  });

  const emit = async (result: AgentRunResult<T>): Promise<AgentRunResult<T>> => {
    if (params.logger) {
      try {
        await params.logger(result.log);
      } catch {
        // Logging must never fail the run.
      }
    }
    return result;
  };

  const userJson = JSON.stringify(input);

  // Up to two attempts: the initial call, then one retry that tells the model how it failed.
  let lastIssues: z.ZodIssue[] | null = null;
  let lastParseError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const retryHint =
      attempt === 0
        ? undefined
        : lastIssues
          ? `Your previous response failed schema validation: ${summariseIssues(lastIssues)}. Return ONLY valid JSON matching the schema.`
          : `Your previous response was not valid JSON (${lastParseError}). Return ONLY a single JSON object.`;

    let response: CompletionResponse;
    try {
      response = await client.complete({
        model,
        system: systemPrompt,
        userJson,
        images: params.images,
        maxTokens: config.maxOutputTokens,
        timeoutMs: config.timeoutMs,
        modelTier: config.modelTier,
        retryHint,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return emit({
        outcome: "error",
        emitEvent: config.lowConfidenceEvent,
        error: message,
        log: finish("error", message),
      });
    }

    tokensIn += response.tokensIn;
    tokensOut += response.tokensOut;

    // Truncated output is a budget breach — the JSON is unreliable; send to the human queue.
    if (response.stopReason === "max_tokens") {
      return emit({
        outcome: "budget_breach",
        emitEvent: config.lowConfidenceEvent,
        reason: "max_output_tokens reached (response truncated)",
        log: finish("budget_breach", "max_output_tokens reached"),
      });
    }

    let parsed: unknown;
    try {
      parsed = extractJson(response.text);
    } catch (err) {
      lastParseError = err instanceof Error ? err.message : String(err);
      lastIssues = null;
      continue; // retry (or fall through to invalid after the loop)
    }

    const validated = outputSchema.safeParse(parsed);
    if (!validated.success) {
      lastIssues = validated.error.issues;
      lastParseError = null;
      continue; // retry (or fall through to invalid)
    }

    const output = validated.data;
    const confidence = readConfidence(output);
    if (confidence !== undefined && confidence < config.confidenceThreshold) {
      return emit({
        outcome: "low_confidence",
        emitEvent: config.lowConfidenceEvent,
        output,
        log: finish("low_confidence", null),
      });
    }

    return emit({
      outcome: "ok",
      emitEvent: config.outputEvent,
      output,
      log: finish("ok", null),
    });
  }

  // Both attempts failed to produce schema-valid JSON → human queue.
  const issues = lastIssues ?? [];
  const error = lastIssues
    ? `invalid output after retry: ${summariseIssues(lastIssues)}`
    : `unparseable output after retry: ${lastParseError}`;
  return emit({
    outcome: "invalid",
    emitEvent: config.lowConfidenceEvent,
    issues,
    log: finish("invalid", error),
  });
}
