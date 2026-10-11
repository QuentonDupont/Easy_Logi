import { z } from "zod";

// The ONLY output this agent produces.
export const Output = z.object({
  // replace with the agent's fields
  result: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(280),
});

export type Output = z.infer<typeof Output>;
