/** Shared types for the import planner engine. All rule data carries provenance (CLAUDE.md rule 5). */

export type DestCountry = "ZA" | "SZ";
export type Mode = "courier" | "air" | "sea_lcl" | "sea_fcl";
export type Incoterm = "EXW" | "FCA" | "FOB" | "CFR" | "CIF" | "DAP" | "DDP";
export type Condition = "new" | "used" | "refurbished" | "remanufactured";

/** BLNE = Botswana, Lesotho, Namibia, Eswatini (no SA 10% ATV uplift when origin AND import are BLNE). */
export const BLNE = ["BW", "LS", "NA", "SZ"] as const;
/** SACU members (no MoF import permit needed into Eswatini for SACU-origin goods). */
export const SACU = ["ZA", "BW", "LS", "NA", "SZ"] as const;

/** Provenance stamped on every rule row. Unverified rows must be shown with a "confirm" note. */
export interface RuleProvenance {
  source_name: string;
  source_url?: string;
  as_of: string; // ISO date
  verified: boolean;
  verify_note?: string;
}

export interface Carton {
  count: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  grossKg: number; // per carton
}

export type GateStatus = "green" | "amber" | "red";

export interface Gate {
  key: string;
  title: string;
  status: GateStatus;
  message: string;
  /** Rule rows this gate is based on; unverified ones drive the "confirm with your clearing agent" note. */
  provenance?: RuleProvenance;
  blocking: boolean;
}
