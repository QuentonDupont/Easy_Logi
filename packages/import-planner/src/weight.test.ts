import { describe, it, expect } from "vitest";
import { chargeableWeight, modeRecommendation } from "./weight";
import type { Carton } from "./types";

// import-planner.md §5 test case: a 25 kg carton, 50×40×30 cm (0.06 CBM).
const carton: Carton = { count: 1, lengthCm: 50, widthCm: 40, heightCm: 30, grossKg: 25 };

describe("chargeableWeight (import-planner.md §5)", () => {
  it("courier: volumetric 12 kg (÷5000) → chargeable 25 kg", () => {
    const r = chargeableWeight("courier", [carton]);
    expect(r.unit).toBe("kg");
    expect(r.chargeable).toBe(25);
  });
  it("air: volumetric 10 kg (÷6000) → chargeable 25 kg", () => {
    expect(chargeableWeight("air", [carton]).chargeable).toBe(25);
  });
  it("sea LCL: billed at the 1 CBM minimum", () => {
    const r = chargeableWeight("sea_lcl", [carton]);
    expect(r.unit).toBe("cbm");
    expect(r.chargeable).toBe(1);
    expect(r.cbm).toBeCloseTo(0.06, 5);
  });
  it("sea LCL W/M: heavy dense cargo bills by tonnes over CBM", () => {
    const dense: Carton = { count: 1, lengthCm: 100, widthCm: 100, heightCm: 100, grossKg: 1500 }; // 1 CBM, 1.5 t
    expect(chargeableWeight("sea_lcl", [dense]).chargeable).toBe(1.5);
  });
});

describe("modeRecommendation (import-planner.md §5)", () => {
  it("light + urgent → courier", () => {
    expect(modeRecommendation([carton], 5).recommended).toBe("courier");
  });
  it("big volume → FCL", () => {
    const big: Carton = { count: 20, lengthCm: 100, widthCm: 100, heightCm: 100, grossKg: 50 }; // 20 CBM
    expect(modeRecommendation([big], 60).recommended).toBe("sea_fcl");
  });
  it("a few CBM with time → sea LCL", () => {
    const mid: Carton = { count: 5, lengthCm: 100, widthCm: 100, heightCm: 80, grossKg: 120 }; // 4 CBM
    expect(modeRecommendation([mid], 60).recommended).toBe("sea_lcl");
  });
  it("computes the courier/LCL crossover from a live LCL quote", () => {
    const r = modeRecommendation([carton], 60, { lclQuoteUsd: 400 });
    expect(r.crossoverKg).toBe(40); // 400 / 10 US$ per kg
  });
});
