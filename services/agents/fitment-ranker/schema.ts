import { z } from "zod";

/**
 * The ONLY output this agent produces: a ranking of the candidate parts it was given, with a
 * reason per candidate and an overall confidence. It may ONLY reference parts present in the
 * input candidates — it never invents a part number (CLAUDE.md rule 1).
 */
export const Output = z.object({
  ranked: z
    .array(
      z.object({
        /** Must equal a candidate's `partId` from the input. */
        partId: z.string().min(1),
        /** Must equal that candidate's `partNumber` from the input. */
        partNumber: z.string().min(1),
        /** 0–1 fit score for this candidate against the request. */
        score: z.number().min(0).max(1),
        /** One short sentence on why it fits (or doesn't). */
        reason: z.string().min(1).max(280),
      }),
    )
    .max(20),
  /** 0–1 confidence in the top candidate being the right part. */
  confidence: z.number().min(0).max(1),
  /** One short sentence summarising the ranking. */
  reason: z.string().min(1).max(280),
});

export type Output = z.infer<typeof Output>;
