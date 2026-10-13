import { normalizePartNumber } from "@/lib/fitment/retrieve";
import type { ExistingPart, ParsedRow, StagedRow } from "./types";

/**
 * Normalise and classify parsed rows against the existing catalogue — plain code, no model.
 * Each row becomes: invalid (missing required fields), duplicate (already in catalogue, or repeated
 * in this file), conflict (same brand+number exists with a different category/description), or new
 * (publishable). Part numbers are compared in canonical form (normalizePartNumber).
 */
function parseConfidence(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 1) return null;
  return Math.round(n * 1000) / 1000;
}

function key(brand: string, partNumber: string): string {
  return `${brand.toLowerCase().trim()}|${normalizePartNumber(partNumber)}`;
}

export function classifyRows(rows: ParsedRow[], existing: ExistingPart[]): StagedRow[] {
  const existingByKey = new Map<string, ExistingPart>();
  for (const p of existing) existingByKey.set(key(p.brand, p.part_number), p);

  const seenInBatch = new Set<string>();
  const out: StagedRow[] = [];

  for (const r of rows) {
    const base: Omit<StagedRow, "status" | "message"> = {
      rowNumber: r.rowNumber,
      partNumber: r.partNumber.trim(),
      normalizedNumber: normalizePartNumber(r.partNumber),
      brand: r.brand.trim(),
      category: r.category.trim(),
      description: r.description.trim(),
      make: r.make.trim() || null,
      model: r.model.trim() || null,
      position: r.position.trim() || null,
      confidence: parseConfidence(r.confidence),
      crossrefBrand: r.crossrefBrand.trim() || null,
      crossrefNumber: r.crossrefNumber.trim() || null,
    };

    if (!base.partNumber || !base.brand || !base.category) {
      out.push({ ...base, status: "invalid", message: "missing part number, brand or category" });
      continue;
    }

    const k = key(base.brand, base.partNumber);
    if (seenInBatch.has(k)) {
      out.push({ ...base, status: "duplicate", message: "repeated earlier in this file" });
      continue;
    }
    seenInBatch.add(k);

    const match = existingByKey.get(k);
    if (match) {
      const sameCategory = match.category.toLowerCase().trim() === base.category.toLowerCase();
      const sameDescription =
        (match.description ?? "").toLowerCase().trim() === base.description.toLowerCase();
      if (sameCategory && sameDescription) {
        out.push({ ...base, status: "duplicate", message: "already in the catalogue" });
      } else {
        out.push({
          ...base,
          status: "conflict",
          message: `exists as "${match.description}" [${match.category}] — needs review`,
        });
      }
      continue;
    }

    out.push({ ...base, status: "new", message: base.make ? "new part + fitment" : "new part" });
  }

  return out;
}

export function countByStatus(rows: StagedRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}
