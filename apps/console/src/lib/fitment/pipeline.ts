import { runAgent, type AgentRunLog, type ImageInput } from "@easy-logi/agent-runtime";
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
  partLabelReaderConfig,
  partLabelReaderPrompt,
  partLabelReaderSchema,
  type PartIntent,
  type FitmentRanking,
  type Clarification,
  type PartLabelReading,
} from "@easy-logi/agents";
import type { FitmentData } from "@/lib/mock/backend";
import { retrieveCandidates, matchByNumber } from "./retrieve";
import {
  offlinePartIntent,
  offlineFitmentRank,
  offlineClarifier,
  offlineLabelRead,
} from "./offline";
import { modelClientFor, hasRealModel } from "./modelClient";
import type { AgentRunSummary, Candidate, FitmentResult, RankedCandidate } from "./types";

type Log = (l: AgentRunLog) => void;

function collectLog(runs: AgentRunSummary[]): Log {
  return (l) =>
    runs.push({
      agent: l.agent,
      model: l.model,
      tokensIn: l.tokensIn,
      tokensOut: l.tokensOut,
      latencyMs: l.latencyMs,
      outcome: l.outcome,
    });
}

/** Run the fitment-ranker over retrieved candidates. `intentForRanker` steers brand/category boosts. */
async function rankStep(
  requestText: string,
  intentForRanker: PartIntent,
  candidates: Candidate[],
  log: Log,
): Promise<{ ranked: RankedCandidate[]; rankConfidence: number }> {
  if (candidates.length === 0) return { ranked: [], rankConfidence: 0 };
  const res = await runAgent<FitmentRanking>({
    config: fitmentRankerConfig,
    systemPrompt: fitmentRankerPrompt,
    outputSchema: fitmentRankerSchema,
    input: {
      request: requestText,
      intent: intentForRanker,
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
  if (res.outcome !== "ok" && res.outcome !== "low_confidence") return { ranked: [], rankConfidence: 0 };
  const byId = new Map<string, Candidate>(candidates.map((c) => [c.partId, c]));
  const ranked = res.output.ranked
    .map((r) => {
      const c = byId.get(r.partId);
      return c ? { ...c, score: r.score, reason: r.reason } : null;
    })
    .filter((x): x is RankedCandidate => x !== null);
  return { ranked, rankConfidence: res.output.confidence };
}

/** Run the clarifier when `trigger` is set, returning its one question or null. */
async function maybeClarify(
  trigger: boolean,
  input: { request: string; intent: PartIntent | null; reason: string; options: Array<{ label: string; value: string }> },
  log: Log,
): Promise<Clarification | null> {
  if (!trigger) return null;
  const res = await runAgent<Clarification>({
    config: clarifierConfig,
    systemPrompt: clarifierPrompt,
    outputSchema: clarifierSchema,
    input,
    client: modelClientFor(offlineClarifier),
    logger: log,
  });
  return res.outcome === "ok" || res.outcome === "low_confidence" ? res.output : null;
}

/** Text entry: intent-extract -> retrieve -> rank -> clarify. Shared by the text and photo paths. */
async function runText(
  requestText: string,
  data: FitmentData,
  log: Log,
): Promise<{ intent: PartIntent | null; ranked: RankedCandidate[]; clarification: Clarification | null }> {
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

  const candidates: Candidate[] = intent ? retrieveCandidates(intent, data) : [];
  const { ranked, rankConfidence } = intent
    ? await rankStep(requestText, intent, candidates, log)
    : { ranked: [] as RankedCandidate[], rankConfidence: 0 };

  const lowIntent = !intent || intent.confidence < partIntentConfig.confidenceThreshold;
  const lowRank = candidates.length === 0 || rankConfidence < fitmentRankerConfig.confidenceThreshold;
  const clarification = await maybeClarify(
    lowIntent || lowRank,
    {
      request: requestText,
      intent: intent ?? null,
      reason: clarifyReason(intent, candidates.length, rankConfidence),
      options: buildClarifyOptions(intent, ranked.length ? ranked : candidates, data),
    },
    log,
  );
  return { intent, ranked, clarification };
}

/**
 * The fitment engine pipeline (Phase 1), run in-process: part-intent-extractor -> deterministic
 * retrieval -> fitment-ranker -> (clarifier when confidence is low). No part number is invented —
 * the ranker only reorders retrieved candidates (CLAUDE.md rule 1).
 */
export async function runFitmentPipeline(params: {
  requestText: string;
  data: FitmentData;
}): Promise<FitmentResult> {
  const runs: AgentRunSummary[] = [];
  const log = collectLog(runs);
  const { intent, ranked, clarification } = await runText(params.requestText, params.data, log);
  return {
    requestText: params.requestText,
    intent,
    labelRead: null,
    candidates: ranked,
    clarification,
    runs,
    usedRealModel: hasRealModel(),
  };
}

/**
 * Photo entry: part-label-reader (vision) reads the brand + part number(s) off the image, then a
 * direct catalogue lookup by number feeds the ranker. If nothing is read/matched, it falls back to
 * the text pipeline on the read brand/text. `image` drives real Sonnet vision; `sampleId` drives
 * the deterministic offline reader when there is no API key.
 */
export async function runFitmentFromPhoto(params: {
  image?: ImageInput | null;
  sampleId?: string | null;
  data: FitmentData;
}): Promise<FitmentResult> {
  const { image, sampleId, data } = params;
  const runs: AgentRunSummary[] = [];
  const log = collectLog(runs);

  const readRes = await runAgent<PartLabelReading>({
    config: partLabelReaderConfig,
    systemPrompt: partLabelReaderPrompt,
    outputSchema: partLabelReaderSchema,
    input: { sampleId: sampleId ?? null, note: "Read the brand and part number off the attached photo." },
    images: image ? [image] : undefined,
    client: modelClientFor(offlineLabelRead),
    logger: log,
  });
  const labelRead =
    readRes.outcome === "ok" || readRes.outcome === "low_confidence" ? readRes.output : null;

  const direct = labelRead && labelRead.numbers.length > 0 ? matchByNumber(labelRead.numbers, data) : [];

  if (direct.length > 0 && labelRead) {
    const requestText = `${labelRead.brand ?? "Part"} ${labelRead.numbers.join(", ")}`.trim();
    const intentForRanker: PartIntent = {
      make: labelRead.brand,
      model: null,
      year: null,
      category: null,
      position: null,
      descriptors: labelRead.numbers,
      confidence: labelRead.confidence,
      reason: labelRead.reason,
    };
    const { ranked, rankConfidence } = await rankStep(requestText, intentForRanker, direct, log);
    const clarification = await maybeClarify(
      rankConfidence < fitmentRankerConfig.confidenceThreshold,
      {
        request: requestText,
        intent: null,
        reason: "The label read matched more than one part.",
        options: buildClarifyOptions(null, ranked.length ? ranked : direct, data),
      },
      log,
    );
    return { requestText, intent: null, labelRead, candidates: ranked, clarification, runs, usedRealModel: hasRealModel() };
  }

  // No direct number match — fall back to searching on the read brand/description.
  const fallbackText = `${labelRead?.brand ?? ""} ${labelRead?.text ?? ""}`.trim() || "part";
  const { intent, ranked, clarification } = await runText(fallbackText, data, log);
  return { requestText: fallbackText, intent, labelRead, candidates: ranked, clarification, runs, usedRealModel: hasRealModel() };
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
