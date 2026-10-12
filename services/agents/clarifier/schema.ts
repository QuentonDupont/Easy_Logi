import { z } from "zod";

/**
 * The ONLY output this agent produces: exactly one disambiguation question for the buyer, with
 * 2–3 answer options. Used when intent or ranking confidence is too low to proceed.
 */
export const Output = z.object({
  /** One short question, phrased for a buyer on WhatsApp. */
  question: z.string().min(1).max(280),
  /** 2–3 tappable options. `value` is the machine answer, `label` is what the buyer sees. */
  options: z
    .array(z.object({ label: z.string().min(1).max(80), value: z.string().min(1).max(80) }))
    .min(2)
    .max(3),
  /** 0–1 confidence that this question will resolve the ambiguity. */
  confidence: z.number().min(0).max(1),
  /** One short sentence on what is ambiguous. */
  reason: z.string().min(1).max(280),
});

export type Output = z.infer<typeof Output>;
