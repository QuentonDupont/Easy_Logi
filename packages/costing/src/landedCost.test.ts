import { describe, it, expect } from "vitest";
import { lineLandedCost, shipmentLandedCost, type RateSet } from "./landedCost";
import { fromMajor, fromMinor, MoneyError } from "./money";

const RATES: RateSet = {
  dutyRate: 0.2,
  vatRate: 0.15,
  vatUpliftRate: 0.1,
  source: "seed:placeholder:verify",
  effectiveDate: "2026-01-01",
};

describe("lineLandedCost", () => {
  it("computes duty on FOB, VAT on uplifted customs value + duty, and landed total", () => {
    const r = lineLandedCost(
      {
        fob: fromMajor(10000, "ZAR"),
        freight: fromMajor(2000, "ZAR"),
        insurance: fromMajor(500, "ZAR"),
      },
      RATES,
    );

    // duty = 0.20 x 10000 = 2000
    expect(r.duty).toEqual(fromMajor(2000, "ZAR"));
    // customs value (CIF) = 10000 + 2000 + 500 = 12500
    expect(r.customsValue).toEqual(fromMajor(12500, "ZAR"));
    // VAT = 0.15 x (1.10 x 12500 + 2000) = 0.15 x 15750 = 2362.50
    expect(r.vat).toEqual(fromMajor(2362.5, "ZAR"));
    // landed = 10000 + 2000 + 500 + 2000 + 2362.50 = 16862.50
    expect(r.landed).toEqual(fromMajor(16862.5, "ZAR"));
  });

  it("treats otherCharges as non-dutiable but part of landed cost", () => {
    const base = lineLandedCost({ fob: fromMajor(1000, "ZAR") }, RATES);
    const withOther = lineLandedCost(
      { fob: fromMajor(1000, "ZAR"), otherCharges: fromMajor(150, "ZAR") },
      RATES,
    );
    // duty and vat unchanged by otherCharges
    expect(withOther.duty).toEqual(base.duty);
    expect(withOther.vat).toEqual(base.vat);
    // landed grows by exactly the other charges
    expect(withOther.landed.minor - base.landed.minor).toBe(15000);
  });

  it("zero rates give landed = fob + freight + insurance + other", () => {
    const r = lineLandedCost(
      { fob: fromMajor(100, "USD"), freight: fromMajor(10, "USD") },
      { ...RATES, dutyRate: 0, vatRate: 0 },
    );
    expect(r.duty.minor).toBe(0);
    expect(r.vat.minor).toBe(0);
    expect(r.landed).toEqual(fromMajor(110, "USD"));
  });

  it("rejects mixed currencies in a line", () => {
    expect(() =>
      lineLandedCost({ fob: fromMajor(100, "ZAR"), freight: fromMajor(10, "USD") }, RATES),
    ).toThrow(MoneyError);
  });

  it("rejects a negative rate", () => {
    expect(() => lineLandedCost({ fob: fromMajor(100, "ZAR") }, { ...RATES, dutyRate: -0.1 })).toThrow(
      MoneyError,
    );
  });
});

describe("shipmentLandedCost", () => {
  it("allocates shared freight by value and sums back exactly", () => {
    const result = shipmentLandedCost(
      {
        basis: "value",
        sharedFreight: fromMajor(900, "ZAR"),
        lines: [{ fob: fromMajor(1000, "ZAR") }, { fob: fromMajor(2000, "ZAR") }],
      },
      RATES,
    );
    // value shares 1:2 of 900 -> 300 / 600
    expect(result.lines[0]!.freight).toEqual(fromMajor(300, "ZAR"));
    expect(result.lines[1]!.freight).toEqual(fromMajor(600, "ZAR"));
    expect(result.totals.freight).toEqual(fromMajor(900, "ZAR"));
  });

  it("allocates shared freight by volume", () => {
    const result = shipmentLandedCost(
      {
        basis: "volume",
        sharedFreight: fromMajor(1000, "ZAR"),
        lines: [
          { fob: fromMajor(5000, "ZAR"), volume: 1 },
          { fob: fromMajor(1000, "ZAR"), volume: 4 },
        ],
      },
      RATES,
    );
    // volume shares 1:4 of 1000 -> 200 / 800 (independent of FOB)
    expect(result.lines[0]!.freight).toEqual(fromMajor(200, "ZAR"));
    expect(result.lines[1]!.freight).toEqual(fromMajor(800, "ZAR"));
  });

  it("per-line landed costs sum to the totals", () => {
    const result = shipmentLandedCost(
      {
        basis: "value",
        sharedFreight: fromMajor(333.33, "ZAR"),
        sharedInsurance: fromMajor(100, "ZAR"),
        lines: [
          { fob: fromMajor(1234.56, "ZAR") },
          { fob: fromMajor(765.44, "ZAR") },
          { fob: fromMajor(2000, "ZAR") },
        ],
      },
      RATES,
    );
    const landedSum = result.lines.reduce((a, l) => a + l.landed.minor, 0);
    expect(landedSum).toBe(result.totals.landed.minor);
    // allocations never lose a cent
    expect(result.totals.freight).toEqual(fromMinor(33333, "ZAR"));
    expect(result.totals.insurance).toEqual(fromMinor(10000, "ZAR"));
  });

  it("requires at least one line and a single currency", () => {
    expect(() => shipmentLandedCost({ basis: "value", lines: [] }, RATES)).toThrow(MoneyError);
    expect(() =>
      shipmentLandedCost(
        { basis: "value", lines: [{ fob: fromMajor(1, "ZAR") }, { fob: fromMajor(1, "USD") }] },
        RATES,
      ),
    ).toThrow(MoneyError);
  });
});
