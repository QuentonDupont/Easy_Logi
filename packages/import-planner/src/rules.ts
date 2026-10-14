/**
 * Import-planner rule data (import-planner.md §2–9). Every row carries provenance and `verified:false`
 * until a clearing agent confirms it — the UI must label unverified rules "Estimate — confirm with
 * your clearing agent". These seeds are fallbacks: a real deployment looks up the live 8-digit rate.
 */
import type { Incoterm, RuleProvenance } from "./types";

const SARS: RuleProvenance = { source_name: "SARS Tariff / Duties & Taxes for Importers", source_url: "https://www.sars.gov.za/customs-and-excise/duties-and-taxes/duties-and-taxes-for-importers", as_of: "2026-10-14", verified: false, verify_note: "Confirm the live 8-digit rate and Schedule 2 anti-dumping." };
const JLOG: RuleProvenance = { source_name: "JLog (from SARS tariff), 2026", source_url: "https://jlog.co.za", as_of: "2026-08-01", verified: false };
const NRCS: RuleProvenance = { source_name: "NRCS compulsory specifications (automotive)", source_url: "https://www.nrcs.org.za/business-units/automotive", as_of: "2026-10-14", verified: false, verify_note: "Confirm which items need an LOA and the LOA validity (12/24 months vs 3 years)." };
const ITAC: RuleProvenance = { source_name: "ITAC import-control guidelines (Jan 2016, still published)", source_url: "https://www.itac.org.za/import-control", as_of: "2026-10-14", verified: false, verify_note: "May change without notice — confirm currency." };
const SZ_MOF: RuleProvenance = { source_name: "Eswatini Ministry of Finance import permits (Import Control Order)", source_url: "https://www.gov.sz", as_of: "2026-10-14", verified: false, verify_note: "Confirm whether new parts from every non-SACU origin need a permit in practice." };

/** NRCS-regulated components — importing or selling needs a Letter of Authority (hard gate). §2.3 */
export interface RegulatedComponent {
  vc: string;
  label: string;
  keywords: string[];
  hs?: string[];
  requirement: string;
  validityMonths: number;
  provenance: RuleProvenance;
}

export const REGULATED_COMPONENTS: RegulatedComponent[] = [
  { vc: "VC 8053", label: "Brake friction material (pads, shoes, linings)", keywords: ["brake pad", "brake shoe", "brake lining", "friction", "brake pads"], hs: ["8708.30"], requirement: "LOA + type-approval docs", validityMonths: 24, provenance: NRCS },
  { vc: "VC 8051", label: "Laminated & toughened safety glass", keywords: ["safety glass", "windscreen", "windshield", "laminated glass", "toughened glass"], requirement: "LOA + type-approval docs", validityMonths: 24, provenance: NRCS },
  { vc: "VC 8013", label: "Hydraulic brake & clutch fluid", keywords: ["brake fluid", "clutch fluid", "hydraulic fluid", "dot 4", "dot 3"], requirement: "LOA", validityMonths: 24, provenance: NRCS },
  { vc: "VC 8080", label: "Elastomeric cups & seals (brake/clutch hydraulic)", keywords: ["brake cup", "clutch cup", "hydraulic seal", "elastomeric"], requirement: "LOA", validityMonths: 24, provenance: NRCS },
  { vc: "VC 8056", label: "Passenger tyres (ECE R30)", keywords: ["passenger tyre", "passenger tire", "car tyre", "car tire"], hs: ["4011"], requirement: "NRCS approval / homologation, E-mark", validityMonths: 24, provenance: NRCS },
  { vc: "VC 8059", label: "Commercial tyres (ECE R54)", keywords: ["truck tyre", "truck tire", "commercial tyre", "bus tyre"], hs: ["4011"], requirement: "NRCS approval / homologation, E-mark", validityMonths: 24, provenance: NRCS },
  // NOTE: no HS seed here — heading 8512 also covers wipers/horns, which are NOT regulated; match
  // lighting by keyword only to avoid false NRCS blocks on 8512 wiper/horn parts (§2.3).
  { vc: "VC (lighting) [VERIFY]", label: "Headlamps, secondary lights, replacement bulbs", keywords: ["headlamp", "headlight", "bulb", "tail light", "indicator light"], requirement: "Treat as regulated — confirm exact VC + LOA need", validityMonths: 24, provenance: NRCS },
];

/** 8-digit duty fallbacks by HS prefix (§2.5). Look up the live 8-digit rate in production. */
export interface DutySeed { hsPrefix: string; label: string; rate: number; provenance: RuleProvenance; note?: string }

export const DUTY_SEEDS: DutySeed[] = [
  { hsPrefix: "8708.30", label: "Brakes, pads, discs", rate: 0.2, provenance: JLOG, note: "Some lines 0–30%" },
  { hsPrefix: "8708.99", label: "Other vehicle parts", rate: 0.2, provenance: JLOG },
  { hsPrefix: "8708", label: "Other 8708 (bumpers, gearboxes, axles, wheels, suspension, radiators, clutches, steering)", rate: 0.2, provenance: SARS, note: "Commonly 20%, some 0–30% [VERIFY]" },
  { hsPrefix: "8421", label: "Filters", rate: 0.15, provenance: SARS, note: "0–15% [VERIFY]" },
  { hsPrefix: "8511", label: "Spark plugs, starters, alternators", rate: 0.2, provenance: SARS, note: "0–20% [VERIFY]" },
  { hsPrefix: "8512", label: "Lighting, wipers, horns", rate: 0.2, provenance: SARS, note: "0–20% [VERIFY]" },
  { hsPrefix: "4011", label: "New tyres", rate: 0.25, provenance: SARS, note: "~25%; anti-dumping may apply (Sch 2) [VERIFY]" },
  { hsPrefix: "8483", label: "Shafts, gears, housings", rate: 0.15, provenance: SARS, note: "0–15% [VERIFY]" },
  { hsPrefix: "8415", label: "Vehicle A/C units", rate: 0.2, provenance: SARS, note: "Varies [VERIFY]" },
];

/** Look up a duty-rate fallback by the most specific HS prefix match. */
export function dutySeedFor(hs: string): DutySeed | undefined {
  const h = hs.replace(/[\s.]/g, "");
  return [...DUTY_SEEDS]
    .sort((a, b) => b.hsPrefix.length - a.hsPrefix.length)
    .find((d) => h.startsWith(d.hsPrefix.replace(/\./g, "")));
}

/** Tariff preference into SACU by country of manufacture (§2.5). None for CN/IN/TH/JP/AE/TR. */
export interface PreferenceRule { countries: string[]; basis: string; dutyFree: boolean; note: string; provenance: RuleProvenance }

export const PREFERENCE_RULES: PreferenceRule[] = [
  { countries: ["DE", "EU", "FR", "IT", "ES", "NL", "BE", "PL"], basis: "SADC–EU EPA", dutyFree: true, note: "e.g. 8708.99 duty-free with EUR.1 / approved-exporter declaration. EU goods via Dubai keep EU origin only with direct-transport proof.", provenance: { source_name: "SADC–EU EPA", as_of: "2026-10-14", verified: false } },
  { countries: ["GB"], basis: "SACU-UK EPA", dutyFree: true, note: "Duty-free with valid UK origin proof.", provenance: { source_name: "SACU-UK EPA", as_of: "2026-10-14", verified: false } },
  { countries: ["CN", "IN", "TH", "JP", "AE", "TR"], basis: "none", dutyFree: false, note: "No preference into SACU — general rates apply. India–SACU PTA ToR signed 12 Aug 2026, nothing in force; re-check 2027.", provenance: { source_name: "import-planner.md §2.5", as_of: "2026-10-14", verified: false } },
];

export function preferenceFor(countryOfManufacture: string): PreferenceRule {
  return (
    PREFERENCE_RULES.find((p) => p.countries.includes(countryOfManufacture)) ?? {
      countries: [countryOfManufacture],
      basis: "none",
      dutyFree: false,
      note: "No known preference — general rates apply. [VERIFY]",
      provenance: { source_name: "default", as_of: "2026-10-14", verified: false },
    }
  );
}

/** ITAC used-goods rule (§2.7) — a hard gate into SA. */
export const ITAC_USED = {
  provenance: ITAC,
  resaleOfUsedCarPartsPermitted: false,
  newEntrantQuotaRandPer6Months: 500_000,
  note: "All used/second-hand goods need an ITAC permit. Commercial import of used car body/mechanical parts or half-cuts for resale is NOT permitted. Used engines ≤3,000cc petrol / ≤3,500cc diesel and gearboxes only under a value quota (new entrants max R500,000 per 6 months). Refurbished/remanufactured are treated as used [VERIFY per product].",
};

/** Eswatini Ministry of Finance import permit (§3.2) — a hard gate; apply BEFORE ordering. */
export const SZ_PERMIT = {
  provenance: SZ_MOF,
  appliesToNonSacuAutomotiveParts: true,
  submitCutoffWeekday: 1, // Monday
  submitCutoffHour24: 16, // 4:00 pm
  decisionWeekday: 3, // Wednesday
  stampRandPerUnit: 1, // E1
  stampPerValue: 2000, // per E2,000 or part thereof
  validityMonths: 12,
  returnWithinDays: 3, // return permit + endorsed bill of entry within 3 days of clearance
  note: "New parts from outside SACU need a permit (Import Control Order lists 'Automotive Parts'). Apply before ordering; 7 copies to the Principal Secretary, Ministry of Finance by Monday 4pm, considered Wednesday; first application triggers a premises inspection. Return permit + endorsed bill of entry within 3 days of clearance. [VERIFY in practice]",
};

/** Default Eswatini VAT value basis (§3.3) — unverified; configurable. */
export const SZ_VALUE_BASIS = {
  basis: "CIF to Eswatini border + Durban charges + duty",
  provenance: { source_name: "import-planner.md §3.3 (open question)", as_of: "2026-10-14", verified: false, verify_note: "FOB vs landed base unconfirmed with ERS." } as RuleProvenance,
};

/** Freight seeds (§4–5), dated, verified=false. Used for an indicative landed-cost range; a real
 * plan uses a live lane quote. Rates in USD. */
const FREIGHT_SRC: RuleProvenance = { source_name: "sino-shipping.com / Dantful (China→Durban), 2026", as_of: "2026-10-01", verified: false, verify_note: "Indicative FOB-lane freight; get a live quote." };

export interface FreightSeed { mode: "courier" | "air" | "sea_lcl" | "sea_fcl"; lowUsd: number; highUsd: number; per: "kg" | "cbm" | "shipment"; provenance: RuleProvenance }

export const FREIGHT_SEEDS: Record<string, FreightSeed> = {
  courier: { mode: "courier", lowUsd: 8, highUsd: 12, per: "kg", provenance: FREIGHT_SRC },
  air: { mode: "air", lowUsd: 5, highUsd: 7, per: "kg", provenance: FREIGHT_SRC },
  sea_lcl: { mode: "sea_lcl", lowUsd: 180, highUsd: 260, per: "cbm", provenance: FREIGHT_SRC },
  sea_fcl: { mode: "sea_fcl", lowUsd: 2400, highUsd: 3600, per: "shipment", provenance: FREIGHT_SRC },
};

/** Easy Logi service fee seed (commerce-model.md) — % of goods value, a pilot hypothesis. */
export const EASY_LOGI_FEE = {
  rate: 0.08,
  provenance: { source_name: "commerce-model.md (pilot hypothesis)", as_of: "2026-10-14", verified: false } as RuleProvenance,
};

/** Incoterm responsibility matrix (§6): who pays each cost. */
export type Party = "buyer" | "seller";
export interface IncotermRow {
  originClearanceTHC: Party;
  mainFreight: Party;
  insurance: Party | "buyer(CFR)/seller-min(CIF)";
  destinationTHC: Party;
  dutyVatClearance: Party;
  inlandDelivery: Party;
  warnings: string[];
}

export const INCOTERM_MATRIX: Record<Incoterm, IncotermRow> = {
  EXW: { originClearanceTHC: "buyer", mainFreight: "buyer", insurance: "buyer", destinationTHC: "buyer", dutyVatClearance: "buyer", inlandDelivery: "buyer", warnings: ["Your forwarder must handle foreign export clearance — avoid EXW unless they can."] },
  FCA: { originClearanceTHC: "seller", mainFreight: "buyer", insurance: "buyer", destinationTHC: "buyer", dutyVatClearance: "buyer", inlandDelivery: "buyer", warnings: [] },
  FOB: { originClearanceTHC: "seller", mainFreight: "buyer", insurance: "buyer", destinationTHC: "buyer", dutyVatClearance: "buyer", inlandDelivery: "buyer", warnings: [] },
  CFR: { originClearanceTHC: "seller", mainFreight: "seller", insurance: "buyer", destinationTHC: "buyer", dutyVatClearance: "buyer", inlandDelivery: "buyer", warnings: ["Freight must be itemised so SARS can use the FOB value."] },
  CIF: { originClearanceTHC: "seller", mainFreight: "seller", insurance: "buyer(CFR)/seller-min(CIF)", destinationTHC: "buyer", dutyVatClearance: "buyer", inlandDelivery: "buyer", warnings: ["Freight and insurance must be itemised so SARS can use the FOB value."] },
  DAP: { originClearanceTHC: "seller", mainFreight: "seller", insurance: "seller", destinationTHC: "seller", dutyVatClearance: "buyer", inlandDelivery: "seller", warnings: [] },
  DDP: { originClearanceTHC: "seller", mainFreight: "seller", insurance: "seller", destinationTHC: "seller", dutyVatClearance: "seller", inlandDelivery: "seller", warnings: ["China 'DDP door-to-door': undervaluation risk, no input VAT, goods cleared in someone else's name. Recommend FCA/FOB instead."] },
};
