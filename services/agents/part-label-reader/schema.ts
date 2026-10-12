import { z } from "zod";

/**
 * The ONLY output this agent produces: what it can read off a photo of a part or its label —
 * candidate part numbers and the brand. It reads only what is visible; it never guesses a number
 * that is not legible in the image (CLAUDE.md rule 1).
 */
export const Output = z.object({
  /** Brand/manufacturer read off the part or box, or null if not legible. */
  brand: z.string().min(1).nullable(),
  /** Candidate part numbers read off the label, most prominent first. Empty if none legible. */
  numbers: z.array(z.string().min(1)).max(10),
  /** Any other salient text read (part name, size), one short line. */
  text: z.string().max(280),
  /** 0–1 confidence the reading is correct and legible. */
  confidence: z.number().min(0).max(1),
  /** One short sentence on what was read or why it was hard. */
  reason: z.string().min(1).max(280),
});

export type Output = z.infer<typeof Output>;
