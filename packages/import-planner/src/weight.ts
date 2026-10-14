import type { Carton, Mode } from "./types";

/** Volumetric divisors and the LCL minimum are rule data (import-planner.md §5), overridable. */
export interface WeightRules {
  courierDivisor: number; // cm³ per kg, default 5000
  airDivisor: number; // default 6000
  lclMinCbm: number; // default 1 CBM
}

export const DEFAULT_WEIGHT_RULES: WeightRules = {
  courierDivisor: 5000,
  airDivisor: 6000,
  lclMinCbm: 1,
};

function totals(cartons: Carton[]): { actualKg: number; cbm: number; volCm3: number } {
  let actualKg = 0;
  let volCm3 = 0;
  for (const c of cartons) {
    actualKg += c.grossKg * c.count;
    volCm3 += c.lengthCm * c.widthCm * c.heightCm * c.count;
  }
  return { actualKg, cbm: volCm3 / 1_000_000, volCm3 };
}

export interface ChargeableWeight {
  mode: Mode;
  /** Billed quantity: kg for courier/air, CBM (W/M, min 1) for sea. */
  chargeable: number;
  unit: "kg" | "cbm";
  actualKg: number;
  cbm: number;
}

/**
 * Chargeable weight by mode (import-planner.md §5):
 * courier = max(actualKg, volCm³/5000); air = max(actualKg, volCm³/6000);
 * sea LCL = W/M max(CBM, tonnes) with a 1 CBM minimum.
 */
export function chargeableWeight(
  mode: Mode,
  cartons: Carton[],
  rules: WeightRules = DEFAULT_WEIGHT_RULES,
): ChargeableWeight {
  const { actualKg, cbm, volCm3 } = totals(cartons);
  if (mode === "courier") {
    return { mode, chargeable: Math.max(actualKg, volCm3 / rules.courierDivisor), unit: "kg", actualKg, cbm };
  }
  if (mode === "air") {
    return { mode, chargeable: Math.max(actualKg, volCm3 / rules.airDivisor), unit: "kg", actualKg, cbm };
  }
  // sea LCL / FCL: W/M — max of CBM and tonnes (1000 kg = 1 revenue tonne), min 1 CBM.
  const wm = Math.max(cbm, actualKg / 1000, rules.lclMinCbm);
  return { mode, chargeable: wm, unit: "cbm", actualKg, cbm };
}

/** Mode-recommendation thresholds are rule data (import-planner.md §5), overridable per live quote. */
export interface ModeThresholds {
  courierMaxKg: number; // below → courier (default ~70)
  airMaxKg: number; // up to → air or if urgent (default ~300)
  fclMinCbm: number; // above → FCL 20ft (default ~13)
  courierRateUsdPerKg: number; // seed US$8–12/kg → use 10
}

export const DEFAULT_MODE_THRESHOLDS: ModeThresholds = {
  courierMaxKg: 70,
  airMaxKg: 300,
  fclMinCbm: 13,
  courierRateUsdPerKg: 10,
};

export interface ModeRecommendation {
  recommended: Mode;
  reason: string;
  cbm: number;
  actualKg: number;
  /** Optional crossover hint: kg below which courier beats LCL, if an LCL quote is given. */
  crossoverKg?: number;
}

/**
 * Recommend a mode from size + urgency (import-planner.md §5). Thresholds are data, overridable by
 * live quotes. If an LCL freight quote (USD, incl. fixed origin/destination costs) is supplied, the
 * crossover kg below which courier is cheaper is computed, never hard-coded.
 */
export function modeRecommendation(
  cartons: Carton[],
  urgencyDays: number,
  opts: { lclQuoteUsd?: number; thresholds?: ModeThresholds } = {},
): ModeRecommendation {
  const t = opts.thresholds ?? DEFAULT_MODE_THRESHOLDS;
  const { actualKg, cbm } = totals(cartons);
  const courierKg = chargeableWeight("courier", cartons).chargeable;

  const crossoverKg =
    opts.lclQuoteUsd && t.courierRateUsdPerKg > 0 ? opts.lclQuoteUsd / t.courierRateUsdPerKg : undefined;

  if (cbm >= t.fclMinCbm) {
    return { recommended: "sea_fcl", reason: `~${cbm.toFixed(1)} CBM fills a container`, cbm, actualKg, crossoverKg };
  }
  const urgent = urgencyDays <= 10;
  if (courierKg <= t.courierMaxKg && (urgent || courierKg <= 30)) {
    return { recommended: "courier", reason: `light (${courierKg.toFixed(0)} kg chargeable)${urgent ? " and urgent" : ""}`, cbm, actualKg, crossoverKg };
  }
  if (urgent && courierKg <= t.airMaxKg) {
    return { recommended: "air", reason: `urgent (${urgencyDays} days) and within air weight`, cbm, actualKg, crossoverKg };
  }
  return { recommended: "sea_lcl", reason: `${cbm.toFixed(2)} CBM, time allows — LCL is cheapest per unit`, cbm, actualKg, crossoverKg };
}
