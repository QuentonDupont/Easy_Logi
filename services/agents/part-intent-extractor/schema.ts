import { z } from "zod";

/**
 * The ONLY output this agent produces: the structured part intent pulled from a buyer's
 * free-text request. Every field the buyer did not make clear is null — never guessed.
 */
export const Output = z.object({
  /** Vehicle make, e.g. "Toyota". Null if not stated. */
  make: z.string().min(1).nullable(),
  /** Vehicle model, e.g. "Hilux". Null if not stated. */
  model: z.string().min(1).nullable(),
  /** Four-digit model year if the buyer gave one. Null otherwise. */
  year: z.number().int().min(1950).max(2100).nullable(),
  /** Broad part category, e.g. "brakes", "engine_consumables", "AC". Null if unclear. */
  category: z.string().min(1).nullable(),
  /** Fitment position when relevant, e.g. "front", "rear", "left". Null otherwise. */
  position: z.string().min(1).nullable(),
  /** Salient part words lifted from the request, e.g. ["brake", "pads"]. */
  descriptors: z.array(z.string().min(1)).max(12),
  /** 0–1 confidence that this intent is correct and specific enough to search on. */
  confidence: z.number().min(0).max(1),
  /** One short sentence on what was found or what is missing. */
  reason: z.string().min(1).max(280),
});

export type Output = z.infer<typeof Output>;
