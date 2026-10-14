import type { Condition, DestCountry, Gate } from "./types";
import { SACU } from "./types";
import { REGULATED_COMPONENTS, ITAC_USED, SZ_PERMIT } from "./rules";

export interface PlanFacts {
  dest: DestCountry;
  countryOfManufacture: string;
  importedFrom?: string;
  condition: Condition;
  /** Free text (part name + description) for NRCS keyword matching. */
  partText: string;
  hs?: string;
  /** Used car body/mechanical part or half-cut (drives the ITAC resale rule). */
  isCarBodyOrMechanical?: boolean;
  forResale?: boolean;
  // evidence the importer already holds (from the guided journey)
  hasLoaForSupplier?: boolean;
  itacPermitHeld?: boolean;
  sarsCodeActive?: boolean;
  ersRegistered?: boolean;
  szPermitApproved?: boolean;
}

const isUsed = (c: Condition) => c === "used" || c === "refurbished" || c === "remanufactured";

/**
 * The NRCS-regulated component a part matches, if any. Keyword matches take priority over HS-prefix
 * matches (so a "truck tyre" resolves to the commercial VC, not whichever row shares HS 4011).
 */
export function regulatedMatch(partText: string, hs?: string) {
  const text = partText.toLowerCase();
  const h = (hs ?? "").replace(/[\s.]/g, "");
  return (
    REGULATED_COMPONENTS.find((r) => r.keywords.some((k) => text.includes(k))) ??
    REGULATED_COMPONENTS.find((r) => (r.hs ?? []).some((p) => h.startsWith(p.replace(/\./g, ""))))
  );
}

/**
 * Evaluate the blocking gates for a plan (import-planner.md §2.3, §2.7, §3.2 + registration).
 * Returns red (blocking) / amber (action needed) / green. Pure.
 */
export function gates(plan: PlanFacts): Gate[] {
  const out: Gate[] = [];
  const used = isUsed(plan.condition);

  // --- SA registration ---
  if (plan.dest === "ZA") {
    out.push({
      key: "sars_code",
      title: "SARS customs client number",
      status: plan.sarsCodeActive ? "green" : "red",
      message: plan.sarsCodeActive ? "Active." : "You need an active SARS customs client number before importing.",
      blocking: !plan.sarsCodeActive,
    });
  }

  // --- Eswatini registration ---
  if (plan.dest === "SZ") {
    out.push({
      key: "ers",
      title: "ERS registration",
      status: plan.ersRegistered ? "green" : "red",
      message: plan.ersRegistered ? "Registered with ERS." : "You need an ERS customs/importer number before importing.",
      blocking: !plan.ersRegistered,
    });
  }

  // --- NRCS Letter of Authority (both destinations) ---
  const reg = regulatedMatch(plan.partText, plan.hs);
  if (reg) {
    const ok = plan.hasLoaForSupplier === true;
    out.push({
      key: "nrcs_loa",
      title: `NRCS Letter of Authority — ${reg.vc}`,
      status: ok ? "green" : "red",
      message: ok
        ? `LOA on file for ${reg.label} (confirm the manufacturer matches this supplier).`
        : `${reg.label} is NRCS-regulated (${reg.vc}). You need an LOA for this part AND this manufacturer before importing. Missing LOA → port hold.`,
      provenance: reg.provenance,
      blocking: !ok,
    });
  }

  // --- ITAC used-goods rule (SA) ---
  if (plan.dest === "ZA" && used) {
    const resaleBlocked = plan.isCarBodyOrMechanical && plan.forResale && !ITAC_USED.resaleOfUsedCarPartsPermitted;
    if (resaleBlocked) {
      out.push({
        key: "itac_used",
        title: "ITAC — used car parts for resale",
        status: "red",
        message: "Commercial import of used car body/mechanical parts or half-cuts for resale is NOT permitted. This order cannot proceed as described.",
        provenance: ITAC_USED.provenance,
        blocking: true,
      });
    } else {
      out.push({
        key: "itac_used",
        title: "ITAC import permit (used goods)",
        status: plan.itacPermitHeld ? "green" : "amber",
        message: plan.itacPermitHeld
          ? "ITAC permit on file."
          : "Used/refurbished/remanufactured goods need an ITAC permit (engines ≤3,000cc petrol / ≤3,500cc diesel and gearboxes only, under a value quota).",
        provenance: ITAC_USED.provenance,
        blocking: !plan.itacPermitHeld,
      });
    }
  }

  // --- Eswatini Ministry of Finance import permit ---
  if (plan.dest === "SZ") {
    const fromSacu = (SACU as readonly string[]).includes(plan.importedFrom ?? plan.countryOfManufacture);
    if (!fromSacu && SZ_PERMIT.appliesToNonSacuAutomotiveParts) {
      out.push({
        key: "sz_permit",
        title: "Eswatini import permit (Ministry of Finance)",
        status: plan.szPermitApproved ? "green" : "red",
        message: plan.szPermitApproved
          ? "Import permit approved."
          : "Automotive parts from outside SACU need a Ministry of Finance import permit — apply BEFORE ordering (7 copies by Monday 4pm, decided Wednesday). No deposit until it's approved.",
        provenance: SZ_PERMIT.provenance,
        blocking: !plan.szPermitApproved,
      });
    }
  }

  return out;
}

export interface PermitCalendar {
  cutoff: Date; // the Monday 16:00 batch this application falls into
  decisionDate: Date; // the following Wednesday
}

/** Eswatini is SAST (UTC+2, no DST). The Monday-4pm cutoff is a SAST wall-clock, so the calendar is
 * computed in SAST regardless of the server's timezone, then returned as absolute instants. */
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

/**
 * Eswatini permit calendar (import-planner.md §3.2): applications are batched to Monday 4pm SAST and
 * considered the Wednesday after. Returns the cutoff an application submitted at `submittedAt` lands
 * in (the earliest Monday 16:00 SAST ≥ submission) and that batch's Wednesday decision date. The
 * returned Dates are absolute instants; interpret them in SAST (UTC+2).
 */
export function nextPermitDecision(submittedAt: Date): PermitCalendar {
  const sast = new Date(submittedAt.getTime() + SAST_OFFSET_MS); // read SAST wall-clock via UTC accessors
  for (let i = 0; i <= 14; i++) {
    const cand = new Date(sast);
    cand.setUTCDate(sast.getUTCDate() + i);
    cand.setUTCHours(SZ_PERMIT.submitCutoffHour24, 0, 0, 0);
    if (cand.getUTCDay() === SZ_PERMIT.submitCutoffWeekday && cand.getTime() >= sast.getTime()) {
      const decision = new Date(cand);
      decision.setUTCDate(cand.getUTCDate() + (SZ_PERMIT.decisionWeekday - SZ_PERMIT.submitCutoffWeekday));
      decision.setUTCHours(23, 59, 59, 0);
      return {
        cutoff: new Date(cand.getTime() - SAST_OFFSET_MS),
        decisionDate: new Date(decision.getTime() - SAST_OFFSET_MS),
      };
    }
  }
  throw new Error("could not compute permit decision date");
}

/** Revenue-stamp fee on an Eswatini permit: E1 per E2,000 of value, or part thereof (§3.2). */
export function permitStampFee(valueMajor: number): number {
  if (valueMajor <= 0) return 0;
  return Math.ceil(valueMajor / SZ_PERMIT.stampPerValue) * SZ_PERMIT.stampRandPerUnit;
}

/** Deadline to return the permit + endorsed bill of entry: release date + 3 days (§3.2). */
export function permitReturnDeadline(releaseDate: Date): Date {
  const d = new Date(releaseDate);
  d.setDate(releaseDate.getDate() + SZ_PERMIT.returnWithinDays);
  return d;
}
