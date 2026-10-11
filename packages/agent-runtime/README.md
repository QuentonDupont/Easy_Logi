# @easy-logi/agent-runtime

The shared execution contract every runtime agent runs through. It is the one place that enforces
the agent rules from `CLAUDE.md` so individual agents stay tiny (prompt + schema + config + evals).

## What it does

`runAgent({ config, systemPrompt, outputSchema, input, client, logger })`:

1. Resolves the model from the agent's tier — `haiku` → `claude-haiku-5-5`,
   `sonnet` → `claude-sonnet-5-5` (`models.ts`).
2. Sends the agent's `prompt.md` as a **prompt-cached** system block and the retrieved `input` as a
   fenced data block the prompt treats as **untrusted data, never instructions** (rule 6).
3. Parses the model's JSON and validates it against the agent's zod schema. **Invalid → exactly one
   retry** (with a hint describing the failure) **→ human queue** (rule 4).
4. If the output carries a `confidence` below the agent's `confidenceThreshold`, routes to the human
   queue instead of the output event.
5. Treats a `max_tokens` stop (truncated output) as a **budget breach** → human queue.
6. Returns exactly one event to emit — `config.outputEvent` on success, or
   `config.lowConfidenceEvent` on low confidence / budget breach / invalid output / error — for
   `services/workflows` to dispatch.
7. Logs every run to `agent_runs` via the injected `logger` (agent, model, tokens, latency,
   tool_calls, outcome, error). A logger failure never fails the run.

## Boundaries

- **No tool loop in this version.** Phase 1 agents run with retrieval done up front and 0 tools, so
  `toolCalls` is always 0. When tools arrive (max 2 per agent), budget enforcement extends here —
  not inside any agent.
- **The SDK lives in one file.** Only `anthropicClient.ts` imports `@anthropic-ai/sdk`; the core
  (`runAgent`) depends on the `ModelClient` interface, so it is unit-tested with a fake client and
  never makes a network call in tests.

## Usage (Phase 1 agent)

```ts
import { runAgent, createAnthropicModelClient } from "@easy-logi/agent-runtime";
import { config } from "./config";
import { Output } from "./schema";
import prompt from "./prompt.md"; // or read the file

const client = createAnthropicModelClient();
const result = await runAgent({
  config,
  systemPrompt: prompt,
  outputSchema: Output,
  input: retrievedContext, // gathered by plain code before the agent runs
  client,
  logger: (log) => recordAgentRun(log), // insert into agent_runs
});

if (result.outcome === "ok") emit(result.emitEvent, result.output);
else emit(result.emitEvent, { needsHuman: true });
```
