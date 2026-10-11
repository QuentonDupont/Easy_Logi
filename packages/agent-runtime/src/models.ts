import type { ModelTier } from "./types";

/**
 * Model id per tier. Haiku-class for classify / extract / translate / digest; Sonnet-class for
 * ranking, drafting and vision judgment (CLAUDE.md "Agent rules"). Larger models only offline.
 * IDs are the current Claude 5 family — never append a date suffix.
 */
export const MODEL_IDS: Record<ModelTier, string> = {
  haiku: "claude-haiku-5-5",
  sonnet: "claude-sonnet-5-5",
};

/** Effort per tier: extract/classify runs cheap; judgment work gets a little more. */
export const EFFORT_BY_TIER: Record<ModelTier, "low" | "medium"> = {
  haiku: "low",
  sonnet: "medium",
};

export function resolveModel(tier: ModelTier): string {
  return MODEL_IDS[tier];
}
