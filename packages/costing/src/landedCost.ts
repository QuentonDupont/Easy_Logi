import {
  type Money,
  type Currency,
  add,
  scale,
  sum,
  zero,
  fromMinor,
  MoneyError,
} from "./money";
import { allocateProportional } from "./allocate";

/**
 * Duty/VAT rates as read from `rates_rules` (never hard-coded — CLAUDE.md rule 5).
 * The caller supplies the rate that was in force on the relevant date, with its provenance.
 */
export interface RateSet {
  /** Fraction applied to FOB, e.g. 0.20. Duty is charged on FOB. */
  dutyRate: number;
  /** VAT fraction, e.g. 0.15. */
  vatRate: number;
  /** Uplift added to the customs value before VAT, e.g. 0.10 (the "+10%" ATV uplift). */
  vatUpliftRate: number;
  source: string;
  effectiveDate: string; // ISO date
}

export interface LineCostInput {
  fob: Money;
  freight?: Money;
  insurance?: Money;
  /** Non-dutiable landed charges (clearing, handling) added to landed cost only. */
  otherCharges?: Money;
}

export interface LineLandedCost {
  fob: Money;
  freight: Money;
  insurance: Money;
  /**
   * SA customs value for VAT = FOB. Freight and insurance are NOT in the VAT base (they are
   * still added to `landed` below). Verify this basis with the clearing agent.
   */
  customsValue: Money;
  /** dutyRate x FOB. */
  duty: Money;
  /** vatRate x ((1 + uplift) x FOB + duty). */
  vat: Money;
  otherCharges: Money;
  /** FOB + freight + insurance + duty + VAT + otherCharges. */
  landed: Money;
}

function validateRates(rates: RateSet): void {
  for (const [k, v] of [
    ["dutyRate", rates.dutyRate],
    ["vatRate", rates.vatRate],
    ["vatUpliftRate", rates.vatUpliftRate],
  ] as const) {
    if (!Number.isFinite(v) || v < 0) {
      throw new MoneyError(`${k} must be a non-negative finite number`);
    }
  }
}

/** Landed cost for a single line whose costs are all already in one currency. */
export function lineLandedCost(input: LineCostInput, rates: RateSet): LineLandedCost {
  validateRates(rates);
  const currency: Currency = input.fob.currency;
  const freight = input.freight ?? zero(currency);
  const insurance = input.insurance ?? zero(currency);
  const otherCharges = input.otherCharges ?? zero(currency);

  for (const m of [freight, insurance, otherCharges]) {
    if (m.currency !== currency) {
      throw new MoneyError(
        `All line costs must share a currency; got ${currency} and ${m.currency}`,
      );
    }
  }

  // duty on FOB
  const duty = scale(input.fob, rates.dutyRate);

  // SA customs value for VAT is the FOB value — freight and insurance are excluded from the VAT
  // base (they are still part of landed cost below). Verify with the clearing agent.
  const customsValue = input.fob;

  // VAT = vatRate x ((1 + uplift) x FOB + duty)
  const uplifted = scale(customsValue, 1 + rates.vatUpliftRate);
  const vat = scale(add(uplifted, duty), rates.vatRate);

  const landed = sum([input.fob, freight, insurance, duty, vat, otherCharges], currency);

  return { fob: input.fob, freight, insurance, customsValue, duty, vat, otherCharges, landed };
}

export interface ShipmentLine {
  fob: Money;
  /** Volume weight (any consistent unit) used when allocating shared costs by volume. */
  volume?: number;
  /** Line-specific non-dutiable charges. */
  otherCharges?: Money;
}

export interface ShipmentCostInput {
  lines: ShipmentLine[];
  /** Shared freight for the whole consolidated shipment, split across lines. */
  sharedFreight?: Money;
  /** Shared insurance for the whole shipment, split across lines. */
  sharedInsurance?: Money;
  /** How shared costs are apportioned: by FOB value, or by volume. */
  basis: "value" | "volume";
}

export interface ShipmentLandedCost {
  lines: LineLandedCost[];
  totals: {
    fob: Money;
    freight: Money;
    insurance: Money;
    duty: Money;
    vat: Money;
    otherCharges: Money;
    landed: Money;
  };
}

/**
 * Landed cost for a consolidated shipment of several lines. Shared freight and insurance are
 * allocated across the lines (by value or volume) with the largest-remainder method, so the
 * per-line parts sum back EXACTLY to the shared totals, then each line is costed.
 */
export function shipmentLandedCost(
  input: ShipmentCostInput,
  rates: RateSet,
): ShipmentLandedCost {
  if (input.lines.length === 0) throw new MoneyError("shipment must have at least one line");
  const currency = input.lines[0]!.fob.currency;
  for (const l of input.lines) {
    if (l.fob.currency !== currency) {
      throw new MoneyError("all shipment lines must share a currency");
    }
  }

  const weights =
    input.basis === "value"
      ? input.lines.map((l) => l.fob.minor)
      : input.lines.map((l) => l.volume ?? 0);

  const freightParts = input.sharedFreight
    ? allocateProportional(input.sharedFreight.minor, weights)
    : input.lines.map(() => 0);
  const insuranceParts = input.sharedInsurance
    ? allocateProportional(input.sharedInsurance.minor, weights)
    : input.lines.map(() => 0);

  const lines = input.lines.map((l, i) =>
    lineLandedCost(
      {
        fob: l.fob,
        freight: fromMinor(freightParts[i]!, currency),
        insurance: fromMinor(insuranceParts[i]!, currency),
        otherCharges: l.otherCharges,
      },
      rates,
    ),
  );

  const totals = {
    fob: sum(lines.map((l) => l.fob), currency),
    freight: sum(lines.map((l) => l.freight), currency),
    insurance: sum(lines.map((l) => l.insurance), currency),
    duty: sum(lines.map((l) => l.duty), currency),
    vat: sum(lines.map((l) => l.vat), currency),
    otherCharges: sum(lines.map((l) => l.otherCharges), currency),
    landed: sum(lines.map((l) => l.landed), currency),
  };

  return { lines, totals };
}
