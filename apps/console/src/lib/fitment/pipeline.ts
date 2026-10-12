import { runAgent, type AgentRunLog } from "@easy-logi/agent-runtime";
import {
  partIntentConfig,
  partIntentPrompt,
  partIntentSchema,
  fitmentRankerConfig,
  fitmentRankerPrompt,
  fitmentRankerSchema,
  clarifierConfig,
  clarifierPrompt,
  clarifierSchema,
  type PartIntent,
  type FitmentRanking,
  type Clarification,
} from "@easy-logi/agents";
import type { FitmentData } from "@/lib/mock/backend";
import { retrieveCandidates } from "./retrieve";
import { offlinePartIntent, offlineFitmentRank, offlineClarifier } from "./offline";
import { modelClientFor, hasRealModel } from "./modelClient";
import type { AgentRunSummary, Candidate, FitmentResult, RankedCandidate } from "./types";

/**
 * The fitment engine pipeline (Phase 1), run in-process: part-intent-extractor -> deterministic
 * retrieval -> fitment-ranker -> (clarifier when confidence is low). In production this is what
 * services/workflows drives off pgmq events; here it runs synchronously against the mock data.
 * Each agent run is logged. No part number is ever invented — the ranker only reorders the
 * retrieved candidates (CLAUDE.md rule 1).
 */
export async function runFitmentPipeline(params: {
  requestText: string;
  data: FitmentData;
}): Promise<FitmentResult> {
  const { requestText, data } = params;
  const runs: AgentRunSummary[] = [];
  const log = (l: AgentRunLog): void => {
    runs.push({
      agent: l.agent,
      model: l.model,
      tokensIn: l.tokensIn,
      tokensOut: l.tokensOut,
      latencyMs: l.latencyMs,
      outcome: l.outcome,
    });
  };

  // 1. Extract intent from the buyer's text.
  const intentRes = await runAgent<PartIntent>({
    config: partIntentConfig,
    systemPrompt: partIntentPrompt,
    outputSchema: partIntentSchema,
    input: { request: requestText },
    client: modelClientFor(offlinePartIntent),
    logger: log,
  });
  const intent =
    intentRes.outcome === "ok" || intentRes.outcome === "low_confidence" ? intentRes.output : null;

  // 2. Retrieve candidate parts (plain code).
  const candidates: Candidate[] = intent ? retrieveCandidates(intent, data) : [];

  // 3. Rank the candidates, if any.
  let ranked: RankedCandidate[] = [];
  let rankConfidence = 0;
  if (intent && candidates.length > 0) {
    const rankRes = await runAgent<FitmentRanking>({
      config: fitmentRankerConfig,
      systemPrompt: fitmentRankerPrompt,
      outputSchema: fitmentRankerSchema,
      input: {
        request: requestText,
        intent,
        candidates: candidates.map((c) => ({
          partId: c.partId,
          partNumber: c.partNumber,
          brand: c.brand,
          category: c.category,
          description: c.description,
          priorScore: c.priorScore,
        })),
      },
      client: modelClientFor(offlineFitmentRank),
      logger: log,
    });
    if (rankRes.outcome === "ok" || rankRes.outcome === "low_confidence") {
      rankConfidence = rankRes.output.confidence;
      const byId = new Map<string, Candidate>(candidates.map((c) => [c.partId, c]));
      ranked = rankRes.output.ranked
        .map((r) => {
          const c = byId.get(r.partId);
          return c ? { ...c, score: r.score, reason: r.reason } : null;
        })
        .filter((x): x is RankedCandidate => x !== null);
    }
  }

  // 4. Ask a clarifying question when confidence is too low to proceed.
  let clarification: Clarification | null = null;
  const lowIntent = !intent || intent.confidence < partIntentConfig.confidenceThreshold;
  const lowRank = candidates.length === 0 || rankConfidence < fitmentRankerConfig.confidenceThreshold;
  if (lowIntent || lowRank) {
    const clarRes = await runAgent<Clarification>({
      config: clarifierConfig,
      systemPrompt: clarifierPrompt,
      outputSchema: clarifierSchema,
      input: {
        request: requestText,
        intent: intent ?? null,
        reason: clarifyReason(intent, candidates.length, rankConfidence),
        options: buildClarifyOptions(intent, ranked.length ? ranked : candidates, data),
      },
      client: modelClientFor(offlineClarifier),
      logger: log,
    });
    if (clarRes.outcome === "ok" || clarRes.outcome === "low_confidence") {
      clarification = clarRes.output;
    }
  }

  return { requestText, intent, candidates: ranked, clarification, runs, usedRealModel: hasRealModel() };
}

function clarifyReason(intent: PartIntent | null, candidateCount: number, rankConfidence: number): string {
  if (!intent) return "Could not understand the request.";
  if (!intent.make && !intent.model) return "No vehicle was named.";
  if (!intent.category) return "The part type was not clear.";
  if (candidateCount === 0) return "No catalogue part matched the request.";
  if (rankConfidence < 0.6) return "More than one part could fit.";
  return "One more detail is needed.";
}

function buildClarifyOptions(
  intent: PartIntent | null,
  candidates: Candidate[],
  data: FitmentData,
): Array<{ label: string; value: string }> {
  if (candidates.length >= 2) {
    return candidates.slice(0, 3).map((c) => ({
      label: `${c.description} (${c.partNumber})`.slice(0, 80),
      value: c.partNumber.slice(0, 80),
    }));
  }
  if (intent && intent.category && !intent.model) {
    return data.vehicles.slice(0, 3).map((v) => ({
      label: `${v.make} ${v.model}`.slice(0, 80),
      value: `${v.make} ${v.model}`.slice(0, 80),
    }));
  }
  return [
    { label: "Brakes", value: "brakes" },
    { label: "Filters / service", value: "engine_consumables" },
    { label: "Something else", value: "other" },
  ];
}
