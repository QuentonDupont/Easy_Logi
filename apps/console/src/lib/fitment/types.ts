import type { PartIntent, Clarification } from "@easy-logi/agents";

/** A part retrieved by the deterministic retrieval step as a possible fit. */
export interface Candidate {
  partId: string;
  partNumber: string;
  brand: string;
  category: string;
  description: string;
  /** 0–1 score from retrieval (keyword + fitment match), before the ranker. */
  priorScore: number;
  /** The catalogue vehicle this candidate was matched through, for display. */
  vehicleLabel: string | null;
}

/** A candidate after the fitment-ranker has scored and explained it. */
export interface RankedCandidate extends Candidate {
  score: number;
  reason: string;
}

/** One line in the visible agent-run log. */
export interface AgentRunSummary {
  agent: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  outcome: string;
}

/** The whole fitment pipeline result handed back to the console. */
export interface FitmentResult {
  requestText: string;
  intent: PartIntent | null;
  candidates: RankedCandidate[];
  clarification: Clarification | null;
  runs: AgentRunSummary[];
  /** True when real Claude ran (ANTHROPIC_API_KEY set); false for the offline stand-in. */
  usedRealModel: boolean;
}
