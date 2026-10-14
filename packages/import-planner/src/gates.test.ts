import { describe, it, expect } from "vitest";
import { gates, nextPermitDecision, permitStampFee, permitReturnDeadline, regulatedMatch, type PlanFacts } from "./gates";

const base: PlanFacts = {
  dest: "ZA",
  countryOfManufacture: "CN",
  importedFrom: "CN",
  condition: "new",
  partText: "front brake pads",
  sarsCodeActive: true,
};
const gate = (facts: Partial<PlanFacts>, key: string) => gates({ ...base, ...facts }).find((g) => g.key === key);

describe("gates — NRCS LOA (import-planner.md §2.3)", () => {
  it("brake pads are regulated → blocking red until an LOA is on file", () => {
    const g = gate({}, "nrcs_loa");
    expect(g?.status).toBe("red");
    expect(g?.blocking).toBe(true);
    expect(g?.title).toContain("VC 8053");
  });
  it("clears to green when the LOA for the supplier is on file", () => {
    expect(gate({ hasLoaForSupplier: true }, "nrcs_loa")?.status).toBe("green");
  });
  it("a non-regulated part raises no LOA gate", () => {
    expect(gate({ partText: "cabin air filter" }, "nrcs_loa")).toBeUndefined();
    expect(regulatedMatch("cabin air filter")).toBeUndefined();
    expect(regulatedMatch("front brake pads")?.vc).toBe("VC 8053");
  });
});

describe("gates — ITAC used goods (import-planner.md §2.7)", () => {
  it("used car body/mechanical parts for resale into SA are blocked outright", () => {
    const g = gate({ condition: "used", isCarBodyOrMechanical: true, forResale: true }, "itac_used");
    expect(g?.status).toBe("red");
    expect(g?.blocking).toBe(true);
    expect(g?.message).toMatch(/not permitted/i);
  });
  it("refurbished/remanufactured are treated as used (still need ITAC)", () => {
    expect(gate({ condition: "remanufactured" }, "itac_used")?.status).toBe("amber");
  });
  it("new goods raise no ITAC gate", () => {
    expect(gate({ condition: "new" }, "itac_used")).toBeUndefined();
  });
});

describe("gates — Eswatini import permit (import-planner.md §3.2)", () => {
  it("new parts from outside SACU into Eswatini block until the permit is approved", () => {
    const g = gate({ dest: "SZ", ersRegistered: true, sarsCodeActive: undefined }, "sz_permit");
    expect(g?.status).toBe("red");
    expect(g?.blocking).toBe(true);
  });
  it("clears when the permit is approved", () => {
    expect(gate({ dest: "SZ", ersRegistered: true, szPermitApproved: true }, "sz_permit")?.status).toBe("green");
  });
  it("SACU-origin goods need no permit", () => {
    expect(gate({ dest: "SZ", countryOfManufacture: "ZA", importedFrom: "ZA", ersRegistered: true }, "sz_permit")).toBeUndefined();
  });
});

describe("Eswatini permit calendar (import-planner.md §3.2) — SAST, timezone-independent", () => {
  const SAST = 2 * 60 * 60 * 1000;
  // SAST wall-clock view of an absolute instant (read via UTC accessors).
  const sast = (d: Date) => new Date(d.getTime() + SAST);
  // An instant whose SAST wall-clock is `weekday` at `hour`:00.
  function submissionSast(weekday: number, hour: number): Date {
    let d = new Date(Date.UTC(2026, 0, 1, hour - 2, 0, 0));
    while (sast(d).getUTCDay() !== weekday) d = new Date(d.getTime() + 86_400_000);
    return d;
  }

  it("submitted Tuesday → next Monday 4pm (SAST) cutoff, that Wednesday decision", () => {
    const tue = submissionSast(2, 10);
    const { cutoff, decisionDate } = nextPermitDecision(tue);
    expect(sast(cutoff).getUTCDay()).toBe(1); // Monday in SAST
    expect(sast(cutoff).getUTCHours()).toBe(16);
    expect(cutoff.getTime()).toBeGreaterThan(tue.getTime());
    const days = (cutoff.getTime() - tue.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(5); // next Monday, ~6 days out
    expect(days).toBeLessThan(7);
    expect(sast(decisionDate).getUTCDay()).toBe(3); // Wednesday
    expect(decisionDate.getTime()).toBeGreaterThan(cutoff.getTime());
  });
  it("submitted Monday morning → same-day 4pm cutoff, same-week Wednesday", () => {
    const mon = submissionSast(1, 10);
    const { cutoff, decisionDate } = nextPermitDecision(mon);
    expect(sast(cutoff).getUTCDay()).toBe(1);
    expect(sast(cutoff).getUTCDate()).toBe(sast(mon).getUTCDate());
    expect(sast(decisionDate).getUTCDay()).toBe(3);
  });
  it("submitted Monday after 4pm → next Monday", () => {
    const mon = submissionSast(1, 17);
    const { cutoff } = nextPermitDecision(mon);
    expect((cutoff.getTime() - mon.getTime()) / 86_400_000).toBeGreaterThan(6);
  });
});

describe("Eswatini permit stamp fee + return deadline (import-planner.md §3.2)", () => {
  it("E1 per E2,000 of value, or part thereof", () => {
    expect(permitStampFee(130_000)).toBe(65);
    expect(permitStampFee(2_000)).toBe(1);
    expect(permitStampFee(2_001)).toBe(2);
    expect(permitStampFee(0)).toBe(0);
  });
  it("return deadline is release date + 3 days", () => {
    const release = new Date(2026, 5, 10);
    expect(permitReturnDeadline(release).getDate()).toBe(13);
  });
});
