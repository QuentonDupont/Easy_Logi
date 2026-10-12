import type { PartIntent } from "@easy-logi/agents";
import type { FitmentData, PartRow, VehicleRow, FitmentRow } from "@/lib/mock/backend";
import type { Candidate } from "./types";

/**
 * Deterministic candidate retrieval — plain code, never an agent (CLAUDE.md: retrieval is done
 * before the agent runs). Given an extracted intent, it finds parts in the catalogue that could
 * fit, via fitment links to matching vehicles and via keyword/category/brand matching, and gives
 * each a prior score. The fitment-ranker reorders these; it never invents a part number (rule 1).
 */

function ci(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

function textContains(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return ci(haystack).includes(ci(needle));
}

/** True when `year` falls inside a "YYYY-YYYY" range string; permissive on malformed ranges. */
function yearInRange(year: number | null, range: string): boolean {
  if (year === null) return true;
  const parts = range.split("-");
  const lo = Number(parts[0]);
  const hi = Number(parts[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return true;
  return year >= lo && year <= hi;
}

function vehicleMatches(intent: PartIntent, v: VehicleRow): boolean {
  const makeOk = !intent.make || textContains(v.make, intent.make) || textContains(intent.make, v.make);
  const modelOk = !intent.model || textContains(v.model, intent.model) || textContains(intent.model, v.model);
  // Require at least one of make/model to be specified and matching to call it a vehicle match.
  if (!intent.make && !intent.model) return false;
  return makeOk && modelOk && yearInRange(intent.year, v.year_range);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function retrieveCandidates(intent: PartIntent, data: FitmentData): Candidate[] {
  const partsById = new Map<string, PartRow>(data.parts.map((p) => [p.id, p]));
  const matchedVehicles = data.vehicles.filter((v) => vehicleMatches(intent, v));
  const matchedVehicleIds = new Set(matchedVehicles.map((v) => v.id));
  const vehicleLabelById = new Map<string, string>(
    matchedVehicles.map((v) => [v.id, `${v.make} ${v.model} (${v.year_range})`]),
  );

  const scores = new Map<string, { score: number; vehicleLabel: string | null }>();

  const consider = (part: PartRow, base: number, vehicleLabel: string | null, fitmentPosition: string | null): void => {
    let score = base;
    // Brand match is a weak signal; what the part actually is (category + descriptors) dominates,
    // so the right part clearly beats same-brand parts of other categories.
    if (intent.make && textContains(part.brand, intent.make)) score += 0.1;
    if (intent.category && ci(part.category) === ci(intent.category)) score += 0.3;
    let descHits = 0;
    for (const d of intent.descriptors) {
      if (descHits < 3 && textContains(part.description, d)) {
        score += 0.08;
        descHits += 1;
      }
    }
    if (intent.position && fitmentPosition && ci(intent.position) === ci(fitmentPosition)) score += 0.1;
    score = clamp01(score);
    const prev = scores.get(part.id);
    if (!prev || score > prev.score) {
      scores.set(part.id, { score, vehicleLabel: vehicleLabel ?? prev?.vehicleLabel ?? null });
    }
  };

  // 1. Parts linked to matched vehicles via fitments — the strongest signal.
  for (const fit of data.fitments as FitmentRow[]) {
    if (!matchedVehicleIds.has(fit.vehicle_id)) continue;
    const part = partsById.get(fit.part_id);
    if (!part) continue;
    // A confirmed vehicle fitment is a solid base; category/descriptors below separate the parts.
    consider(part, 0.3 + 0.2 * fit.confidence, vehicleLabelById.get(fit.vehicle_id) ?? null, fit.position);
  }

  // 2. Keyword / category / brand matches across the whole catalogue (weaker base).
  const hasQuery = Boolean(intent.category) || intent.descriptors.length > 0 || Boolean(intent.make);
  if (hasQuery) {
    for (const part of data.parts) {
      const categoryHit = intent.category ? ci(part.category) === ci(intent.category) : false;
      const descHit = intent.descriptors.some((d) => textContains(part.description, d));
      const brandHit = intent.make ? textContains(part.brand, intent.make) : false;
      if (categoryHit || descHit || brandHit) {
        consider(part, 0.3, null, null);
      }
    }
  }

  const candidates: Candidate[] = [];
  for (const [partId, { score, vehicleLabel }] of scores.entries()) {
    const part = partsById.get(partId);
    if (!part) continue;
    candidates.push({
      partId,
      partNumber: part.part_number,
      brand: part.brand,
      category: part.category,
      description: part.description,
      priorScore: Number(score.toFixed(3)),
      vehicleLabel,
    });
  }

  candidates.sort((a, b) => b.priorScore - a.priorScore);
  return candidates.slice(0, 8);
}
