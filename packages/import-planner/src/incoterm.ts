import { INCOTERM_MATRIX, type IncotermRow } from "./rules";
import type { Incoterm } from "./types";

export const RECOMMENDED_INCOTERMS: Incoterm[] = ["FOB", "FCA"];

export function incotermResponsibilities(incoterm: Incoterm): IncotermRow {
  return INCOTERM_MATRIX[incoterm];
}

export interface IncotermAdvice {
  incoterm: Incoterm;
  recommended: boolean;
  warnings: string[];
  /** SARS still needs the FOB value under CIF/CFR/DDP, so freight/insurance must be itemised. */
  needsItemisedFreight: boolean;
}

export function incotermAdvice(incoterm: Incoterm): IncotermAdvice {
  return {
    incoterm,
    recommended: RECOMMENDED_INCOTERMS.includes(incoterm),
    warnings: INCOTERM_MATRIX[incoterm].warnings,
    needsItemisedFreight: incoterm === "CIF" || incoterm === "CFR" || incoterm === "DDP",
  };
}
