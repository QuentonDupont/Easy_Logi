import type { DestCountry, Incoterm, Mode } from "./types";

export type SzRoute = "durban_clear" | "rib_matsapha" | "maputo";

export interface TimelineInput {
  dest: DestCountry;
  mode: Mode;
  incoterm: Incoterm;
  /** Eswatini routing (import-planner.md §8); ignored for ZA. */
  route?: SzRoute;
  /** Eswatini non-SACU permit needed (gates it before the deposit). */
  permitNeeded?: boolean;
  /** SA advance payment over R50,000 (post-clearance bank step). */
  advanceOverThreshold?: boolean;
}

export interface TimelineStep {
  phase: "Gates" | "Supplier" | "Origin & freight" | "Destination" | "After";
  code: string;
  title: string;
  who: string;
  payTo?: string;
  docs?: string[];
}

/**
 * Per-shipment step & payment timeline (import-planner.md §7), with who-pays-whom and documents,
 * branched by destination, route and mode. Pure — dates are attached by the caller from real events.
 */
export function buildTimeline(input: TimelineInput): TimelineStep[] {
  const sea = input.mode === "sea_lcl" || input.mode === "sea_fcl";
  const steps: TimelineStep[] = [];

  // Phase 0 — gates
  steps.push({ phase: "Gates", code: "0.1", title: "Confirm 8-digit HS code + duty rate", who: "Easy Logi + you" });
  if (input.dest === "ZA") {
    steps.push({ phase: "Gates", code: "0.2", title: "SARS code active; NRCS LOA if regulated; ITAC permit if used", who: "You (block ordering until in place)" });
  } else {
    if (input.permitNeeded) {
      steps.push({ phase: "Gates", code: "0.3", title: "Eswatini import permit from the pro forma — submit by Monday 4pm", who: "You", payTo: "Ministry of Finance (revenue stamps)" });
    }
  }
  steps.push({ phase: "Gates", code: "0.4", title: "Optional pre-shipment inspection booking", who: "You" });

  // Phase 1 — supplier
  steps.push({ phase: "Supplier", code: "1.1", title: "Pay deposit (typically 30%)", who: "You", payTo: "Seller (verified details)", docs: ["Proof of payment"] });
  steps.push({ phase: "Supplier", code: "1.2", title: "Production → inspection → pay balance before loading", who: "You", payTo: "Seller", docs: ["Inspection report (optional)", "Proof of payment"] });

  // Phase 2 — origin & freight (per Incoterm)
  steps.push({ phase: "Origin & freight", code: "2.1", title: `Export clearance + freight (${input.incoterm})`, who: input.incoterm === "EXW" ? "Your forwarder" : "Seller / forwarder", docs: ["Commercial invoice", "Packing list", sea ? "Bill of lading" : "Air/courier waybill"] });

  // Phase 3 — destination
  if (sea) {
    steps.push({ phase: "Destination", code: "3.1", title: "Arrival notice", who: "Carrier" });
    steps.push({ phase: "Destination", code: "3.2", title: "Pay destination charges (DTHC, DO, cargo dues / CFS) → DO released", who: "You", payTo: "Shipping line / terminal" });
  } else {
    steps.push({ phase: "Destination", code: "3.1", title: "Courier/airline handling on arrival", who: "Courier / airline" });
  }
  steps.push({ phase: "Destination", code: "3.3", title: "Agent lodges SAD 500 with LOA / ITAC / permit", who: "Clearing agent" });

  if (input.dest === "SZ" && input.route === "rib_matsapha") {
    steps.push({ phase: "Destination", code: "3.4", title: "RIB bond lodged at Durban; duty + VAT paid at Matsapha", who: "Bonded carrier + agent", payTo: "ERS (at Matsapha)" });
  } else if (input.dest === "SZ" && input.route === "maputo") {
    steps.push({ phase: "Destination", code: "3.4", title: "Maputo transit (bond + e-seal) to the Eswatini border; cleared there", who: "Agent", payTo: "ERS (at border)" });
  } else {
    steps.push({ phase: "Destination", code: "3.4", title: "Duty + VAT to customs (or deferment)", who: "You / agent", payTo: input.dest === "ZA" ? "SARS" : "ERS (at Durban)" });
  }

  steps.push({ phase: "Destination", code: "3.5", title: "Release (or stop / NRCS inspection)", who: "Customs" });
  steps.push({ phase: "Destination", code: "3.6", title: "Agent fee + disbursement + storage if free time exceeded", who: "You", payTo: "Clearing agent" });
  steps.push({ phase: "Destination", code: "3.7", title: "Road transport to destination", who: "Haulier", payTo: "Haulier" });
  if (input.mode === "sea_fcl") {
    steps.push({ phase: "Destination", code: "3.8", title: "Return the container within detention free time; reclaim deposit", who: "You" });
  }

  // Phase 4 — after
  if (input.dest === "SZ" && input.permitNeeded) {
    steps.push({ phase: "After", code: "3.9", title: "Return the permit + endorsed bill of entry within 3 days", who: "You", payTo: "Ministry of Finance" });
  }
  if (input.dest === "ZA" && input.advanceOverThreshold) {
    steps.push({ phase: "After", code: "3.9", title: "Give your bank the customs clearance docs (advance payment > R50,000)", who: "You", payTo: "Your bank" });
  }
  steps.push({ phase: "After", code: "3.10", title: "Reconcile every line: estimated vs actual", who: "You + Easy Logi" });

  return steps;
}
