/**
 * @easy-logi/agents — the runtime agents' static definitions (config + output schema + system
 * prompt), importable by the pipeline. The canonical, human-/eval-readable prompt lives in each
 * agent's prompt.md; the `systemPrompt` string re-exported here mirrors it and is kept in lockstep
 * by agents.test.ts. The `pnpm eval <agent>` CLI still loads these folders by path.
 *
 * `_template/` is scaffolding for new agents (via the agent-builder subagent), not a live agent.
 */
import type { AgentConfig } from "@easy-logi/agent-runtime";

export {
  config as partIntentConfig,
} from "./part-intent-extractor/config";
export { systemPrompt as partIntentPrompt } from "./part-intent-extractor/prompt";
export {
  Output as partIntentSchema,
  type Output as PartIntent,
} from "./part-intent-extractor/schema";

export { config as fitmentRankerConfig } from "./fitment-ranker/config";
export { systemPrompt as fitmentRankerPrompt } from "./fitment-ranker/prompt";
export {
  Output as fitmentRankerSchema,
  type Output as FitmentRanking,
} from "./fitment-ranker/schema";

export { config as clarifierConfig } from "./clarifier/config";
export { systemPrompt as clarifierPrompt } from "./clarifier/prompt";
export {
  Output as clarifierSchema,
  type Output as Clarification,
} from "./clarifier/schema";

import { config as partIntentConfig } from "./part-intent-extractor/config";
import { config as fitmentRankerConfig } from "./fitment-ranker/config";
import { config as clarifierConfig } from "./clarifier/config";

/** All live Phase-1 agent configs, keyed by name. */
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  "part-intent-extractor": partIntentConfig,
  "fitment-ranker": fitmentRankerConfig,
  clarifier: clarifierConfig,
};
