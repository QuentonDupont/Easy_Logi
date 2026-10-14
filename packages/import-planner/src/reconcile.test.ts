import { describe, it, expect } from "vitest";
import { reconcile, type PlanLine } from "./reconcile";

const lines: PlanLine[] = [
  { key: "goods", label: "Goods (pay seller)", estimateLowMinor: 100_000, estimateHighMinor: 100_000, actualMinor: 100_000 },
  { key: "freight", label: "Freight share", estimateLowMinor: 20_000, estimateHighMinor: 36_000, actualMinor: 42_000 }, // over
  { key: "duty_vat", label: "Duty + VAT", estimateLowMinor: 30_000, estimateHighMinor: 40_000 }, // pending
];

describe("reconcile (import-planner.md §7)", () => {
  it("flags over/within/pending per line", () => {
    const r = reconcile(lines);
    expect(r.lines[0]!.status).toBe("within");
    expect(r.lines[0]!.varianceMinor).toBe(0);
    expect(r.lines[1]!.status).toBe("over");
    expect(r.lines[1]!.varianceMinor).toBe(42_000 - 28_000); // actual − midpoint(20k,36k)
    expect(r.lines[2]!.status).toBe("pending");
    expect(r.lines[2]!.varianceMinor).toBeNull();
  });
  it("totals actual paid and what remains (high estimate of unpaid lines)", () => {
    const r = reconcile(lines);
    expect(r.totals.actualMinor).toBe(142_000);
    expect(r.totals.remainingMinor).toBe(40_000); // only the pending duty+VAT line
    expect(r.totals.estimateHighMinor).toBe(176_000);
  });
  it("marks an actual below the low estimate as under", () => {
    const r = reconcile([{ key: "x", label: "x", estimateLowMinor: 100, estimateHighMinor: 200, actualMinor: 50 }]);
    expect(r.lines[0]!.status).toBe("under");
  });
});
