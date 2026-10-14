import { BLNE, type Incoterm } from "./types";

/** Round half away from zero (matches @easy-logi/costing's money rounding). */
export function roundHalfAwayFromZero(n: number): number {
  return n < 0 ? -Math.round(-n) : Math.round(n);
}

export interface ImportTaxInput {
  /** Customs value in minor units (cents). */
  customsValueMinor: number;
  /** Duty fraction, e.g. 0.20. */
  dutyRate: number;
  /** VAT fraction, e.g. 0.15. */
  vatRate: number;
  /** ATV uplift added to the customs value before VAT (SA: 0.10, or 0 for BLNE; SZ: 0). */
  vatUpliftRate: number;
  /** Extra fiscal charges in the VAT base (SZ only); excluded from the base when omitted. */
  otherChargesMinor?: number;
  includeOtherInVatBase?: boolean;
}

export interface ImportTaxes {
  dutyMinor: number;
  vatMinor: number;
  /** The VAT base (added tax value): round(cv x (1+uplift)) + duty [+ other, SZ]. */
  atvMinor: number;
}

/**
 * Canonical duty + VAT arithmetic — the SINGLE SOURCE OF TRUTH for SA/SZ import tax maths
 * (@easy-logi/costing delegates here). Matches the costing money rounding exactly:
 *   duty = round(cv x dutyRate)
 *   atv  = round(cv x (1 + uplift)) + duty [+ otherCharges, SZ]
 *   vat  = round(atv x vatRate)
 */
export function importTaxes(input: ImportTaxInput): ImportTaxes {
  if (![input.dutyRate, input.vatRate, input.vatUpliftRate].every((r) => Number.isFinite(r) && r >= 0)) {
    throw new Error("rates must be non-negative finite numbers");
  }
  const dutyMinor = roundHalfAwayFromZero(input.customsValueMinor * input.dutyRate);
  const uplifted = roundHalfAwayFromZero(input.customsValueMinor * (1 + input.vatUpliftRate));
  const other = input.includeOtherInVatBase ? input.otherChargesMinor ?? 0 : 0;
  const atvMinor = uplifted + dutyMinor + other;
  const vatMinor = roundHalfAwayFromZero(atvMinor * input.vatRate);
  return { dutyMinor, vatMinor, atvMinor };
}

export const SA_VAT_RATE = 0.15;
export const SA_ATV_UPLIFT = 0.1;
export const SZ_VAT_RATE = 0.15;

/**
 * South Africa import taxes (import-planner.md §2.4). Customs value = FOB. VAT base gets the +10%
 * ATV uplift, EXCEPT where goods both originate in and are imported from BLNE (Botswana, Lesotho,
 * Namibia, Eswatini). Must reproduce the SARS R172.50 example and the R39,500 brake-pad example.
 */
export function saTaxes(
  customsValueMinor: number,
  dutyRate: number,
  opts: { origin: string; importedFrom: string; vatRate?: number } = { origin: "CN", importedFrom: "CN" },
): ImportTaxes {
  const blne = (BLNE as readonly string[]).includes(opts.origin) && (BLNE as readonly string[]).includes(opts.importedFrom);
  return importTaxes({
    customsValueMinor,
    dutyRate,
    vatRate: opts.vatRate ?? SA_VAT_RATE,
    vatUpliftRate: blne ? 0 : SA_ATV_UPLIFT,
  });
}

/**
 * Eswatini import taxes (import-planner.md §3.3): duty on the SACU tariff; VAT = 15% x (value base +
 * duty + other fiscal charges). NO 10% uplift. The value base itself (FOB vs CIF-to-border + Durban
 * charges) is supplied by the caller and is unverified — see rules.szValueBasis.
 */
export function szTaxes(
  valueBaseMinor: number,
  dutyRate: number,
  opts: { otherChargesMinor?: number; vatRate?: number } = {},
): ImportTaxes {
  return importTaxes({
    customsValueMinor: valueBaseMinor,
    dutyRate,
    vatRate: opts.vatRate ?? SZ_VAT_RATE,
    vatUpliftRate: 0,
    otherChargesMinor: opts.otherChargesMinor,
    includeOtherInVatBase: true,
  });
}

export interface FobResult {
  fobMinor: number;
  /** True when freight/insurance should have been itemised to back out FOB but weren't. */
  incomplete: boolean;
  note?: string;
}

/**
 * Back out the FOB customs value from an invoice total given the Incoterm (import-planner.md §2.4, §6).
 * Under CIF/CFR/DDP the invoice includes freight (and insurance), which SARS excludes from the customs
 * value — so they must be itemised. FOB/FCA ≈ FOB. EXW/DAP are approximated (flagged).
 */
export function toCustomsValueFOB(
  invoiceMinor: number,
  incoterm: Incoterm,
  parts: { freightMinor?: number; insuranceMinor?: number } = {},
): FobResult {
  const freight = parts.freightMinor ?? 0;
  const insurance = parts.insuranceMinor ?? 0;
  switch (incoterm) {
    case "CIF":
    case "DDP": {
      const incomplete = freight === 0 && insurance === 0;
      return {
        fobMinor: invoiceMinor - freight - insurance,
        incomplete,
        note: incomplete
          ? "CIF/DDP invoice: freight and insurance must be itemised so SARS can use the FOB value."
          : incoterm === "DDP"
            ? "DDP: duty/VAT are also in the price; verify the FOB build-up with the seller."
            : undefined,
      };
    }
    case "CFR": {
      const incomplete = freight === 0;
      return {
        fobMinor: invoiceMinor - freight,
        incomplete,
        note: incomplete ? "CFR invoice: freight must be itemised to back out the FOB value." : undefined,
      };
    }
    case "EXW":
    case "DAP":
      return { fobMinor: invoiceMinor, incomplete: false, note: `${incoterm}: customs value approximated from the invoice; confirm the FOB build-up.` };
    case "FOB":
    case "FCA":
    default:
      return { fobMinor: invoiceMinor, incomplete: false };
  }
}
