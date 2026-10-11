import { describe, it, expect } from "vitest";
import { convert, type FxRate } from "./fx";
import { fromMinor, MoneyError } from "./money";

const zarUsd: FxRate = {
  from: "ZAR",
  to: "USD",
  rate: 0.055,
  source: "seed:placeholder",
  effectiveDate: "2026-01-01",
};

describe("convert", () => {
  it("applies the rate and rounds to minor units", () => {
    // ZAR 1000.00 -> USD at 0.055 = USD 55.00
    expect(convert(fromMinor(100000, "ZAR"), "USD", zarUsd)).toEqual(fromMinor(5500, "USD"));
  });

  it("is a no-op when source currency equals target", () => {
    const m = fromMinor(100000, "ZAR");
    const same: FxRate = { ...zarUsd, to: "ZAR" };
    expect(convert(m, "ZAR", same)).toBe(m);
  });

  it("rejects a rate whose `from` does not match the amount", () => {
    expect(() => convert(fromMinor(100, "USD"), "USD", zarUsd)).toThrow(MoneyError);
  });

  it("rejects a rate whose `to` does not match the requested target", () => {
    expect(() => convert(fromMinor(100, "ZAR"), "CNY", zarUsd)).toThrow(MoneyError);
  });

  it("rejects a non-positive rate", () => {
    expect(() => convert(fromMinor(100, "ZAR"), "USD", { ...zarUsd, rate: 0 })).toThrow(
      MoneyError,
    );
  });
});
