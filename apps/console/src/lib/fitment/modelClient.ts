import {
  createAnthropicModelClient,
  createOfflineModelClient,
  type ModelClient,
} from "@easy-logi/agent-runtime";

/** True when a real Anthropic key is configured — then agents call Claude for real. */
export function hasRealModel(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let sharedRealClient: ModelClient | null = null;

/**
 * Pick the model client for one agent run: the shared real Anthropic client when a key is set
 * (prompt caching reuses the system prefix across agents), otherwise a deterministic offline
 * stand-in driven by this agent's `respond` function.
 */
export function modelClientFor(respond: (input: unknown) => unknown): ModelClient {
  if (hasRealModel()) {
    if (!sharedRealClient) sharedRealClient = createAnthropicModelClient();
    return sharedRealClient;
  }
  return createOfflineModelClient(respond);
}
