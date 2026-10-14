import { describe, it, expect } from "vitest";
import { importTaxes, saTaxes, szTaxes, toCustomsValueFOB } from "./tax";

const R = (rands: number) => Math.round(rands * 100); // Rands → minor units (cents)

describe("importTaxes / saTaxes — SARS worked examples (import-planner.md §2.4)", () => {
  it("SARS example: customs value R1,000, duty 5% → duty R50, ATV R1,150, VAT R172.50", () => {
    const t = importTaxes({ customsValueMinor: R(1000), dutyRate: 0.05, vatRate: 0.15, vatUpliftRate: 0.1 });
    expect(t.dutyMinor).toBe(R(50));
    expect(t.atvMinor).toBe(R(1150));
    expect(t.vatMinor).toBe(R(172.5));
  });

  it("brake pads FOB R100,000, duty 20% → duty R20,000, ATV R130,000, VAT R19,500, total to SARS R39,500", () => {
    const t = saTaxes(R(100_000), 0.2, { origin: "CN", importedFrom: "CN" });
    expect(t.dutyMinor).toBe(R(20_000));
    expect(t.atvMinor).toBe(R(130_000));
    expect(t.vatMinor).toBe(R(19_500));
    expect(t.dutyMinor + t.vatMinor).toBe(R(39_500));
  });

  it("BLNE origin + import: no 10% uplift → lower VAT than the general case", () => {
    const general = saTaxes(R(100_000), 0.2, { origin: "CN", importedFrom: "CN" });
    const blne = saTaxes(R(100_000), 0.2, { origin: "SZ", importedFrom: "SZ" });
    expect(blne.atvMinor).toBe(R(120_000)); // FOB + duty, no uplift
    expect(blne.vatMinor).toBe(R(18_000));
    expect(blne.vatMinor).toBeLessThan(general.vatMinor);
  });

  it("BLNE applies only when BOTH origin and import are BLNE", () => {
    const made_cn_via_sz = saTaxes(R(100_000), 0.2, { origin: "CN", importedFrom: "SZ" });
    expect(made_cn_via_sz.vatMinor).toBe(R(19_500)); // uplift still applies
  });
});

describe("szTaxes — Eswatini (import-planner.md §3.3): no uplift", () => {
  it("VAT = 15% × (value base + duty), no 10% uplift", () => {
    const t = szTaxes(R(100_000), 0.2);
    expect(t.dutyMinor).toBe(R(20_000));
    expect(t.atvMinor).toBe(R(120_000)); // base + duty, no uplift
    expect(t.vatMinor).toBe(R(18_000));
  });
  it("adds other fiscal charges to the VAT base", () => {
    const t = szTaxes(R(100_000), 0.2, { otherChargesMinor: R(5_000) });
    expect(t.atvMinor).toBe(R(125_000));
    expect(t.vatMinor).toBe(R(18_750));
  });
});

describe("toCustomsValueFOB (import-planner.md §2.4, §6)", () => {
  it("CIF backs out freight + insurance", () => {
    const r = toCustomsValueFOB(R(110_000), "CIF", { freightMinor: R(8_000), insuranceMinor: R(2_000) });
    expect(r.fobMinor).toBe(R(100_000));
    expect(r.incomplete).toBe(false);
  });
  it("CIF without itemised freight/insurance is flagged incomplete", () => {
    const r = toCustomsValueFOB(R(110_000), "CIF");
    expect(r.incomplete).toBe(true);
    expect(r.note).toMatch(/itemised/i);
  });
  it("CFR backs out freight only", () => {
    expect(toCustomsValueFOB(R(108_000), "CFR", { freightMinor: R(8_000) }).fobMinor).toBe(R(100_000));
  });
  it("FOB/FCA use the invoice as-is", () => {
    expect(toCustomsValueFOB(R(100_000), "FOB").fobMinor).toBe(R(100_000));
    expect(toCustomsValueFOB(R(100_000), "FCA").incomplete).toBe(false);
  });
  it("DDP backs out freight + insurance and warns", () => {
    const r = toCustomsValueFOB(R(120_000), "DDP", { freightMinor: R(8_000), insuranceMinor: R(2_000) });
    expect(r.fobMinor).toBe(R(110_000));
    expect(r.note).toMatch(/DDP/);
  });
});
