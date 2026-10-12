import type { CompletionRequest, CompletionResponse, ModelClient } from "./types";

/**
 * A deterministic, offline stand-in for the real model, for local dev and tests with no
 * ANTHROPIC_API_KEY. It parses the agent's input JSON and calls `respond` to produce the output
 * object, which it returns as JSON text — exactly where the real model's JSON would go, so
 * `runAgent` validates it against the agent's schema the same way. No network, no cost.
 *
 * This is a test/dev double for the model only; it does not reclassify an agent's job as code.
 */
export function createOfflineModelClient(respond: (input: unknown) => unknown): ModelClient {
  return {
    async complete(req: CompletionRequest): Promise<CompletionResponse> {
      let input: unknown = {};
      try {
        input = JSON.parse(req.userJson);
      } catch {
        input = {};
      }
      const text = JSON.stringify(respond(input));
      return {
        text,
        model: `${req.model} (offline)`,
        tokensIn: Math.ceil(req.userJson.length / 4),
        tokensOut: Math.ceil(text.length / 4),
        stopReason: "end_turn",
      };
    },
  };
}
