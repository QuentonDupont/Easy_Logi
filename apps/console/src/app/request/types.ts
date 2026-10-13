import type { FitmentResult } from "@/lib/fitment/types";

/** State for the public buyer "find my part" intake (kept out of the "use server" module). */
export interface BuyerFindState {
  result: FitmentResult | null;
  error?: string;
  ts?: number;
}

export const INITIAL_BUYER: BuyerFindState = { result: null };
