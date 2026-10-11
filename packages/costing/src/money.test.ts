import { describe, it, expect } from "vitest";
import {
  fromMajor,
  fromMinor,
  toMajor,
  add,
  subtract,
  scale,
  sum,
  zero,
  format,
  roundHalfAwayFromZero,
  MoneyError,
} from "./money";

describe("money construction", () => {
  it("converts major to minor units, rounding half away from zero", () => {
    expect(fromMajor(100.5, "ZAR").minor).toBe(10050);
    expect(fromMajor(0.005, "ZAR").minor).toBe(1); // 0.5 cents -> 1
    expect(fromMajor(-1.235, "ZAR").minor).toBe(-124); // -123.5 -> -124
  });

  it("rejects non-integer minor units", () => {
    expect(() => fromMinor(1.5, "ZAR")).toThrow(MoneyError);
  });

  it("rejects unknown currencies", () => {
    // @ts-expect-error testing runtime guard
    expect(() => fromMinor(100, "GBP")).toThrow(MoneyError);
  });

  it("round-trips major values", () => {
    expect(toMajor(fromMajor(42.42, "USD"))).toBe(42.42);
  });
});

describe("arithmetic", () => {
  it("adds and subtracts same-currency money", () => {
    expect(add(fromMinor(100, "ZAR"), fromMinor(50, "ZAR")).minor).toBe(150);
    expect(subtract(fromMinor(100, "ZAR"), fromMinor(50, "ZAR")).minor).toBe(50);
  });

  it("refuses to mix currencies", () => {
    expect(() => add(fromMinor(100, "ZAR"), fromMinor(50, "USD"))).toThrow(MoneyError);
  });

  it("scales by a factor with rounding", () => {
    expect(scale(fromMinor(1000, "ZAR"), 0.15).minor).toBe(150);
    expect(scale(fromMinor(333, "ZAR"), 0.5).minor).toBe(167); // 166.5 -> 167
  });

  it("sums a list, empty -> zero", () => {
    expect(sum([], "ZAR")).toEqual(zero("ZAR"));
    expect(sum([fromMinor(10, "USD"), fromMinor(20, "USD")], "USD").minor).toBe(30);
  });
});

describe("rounding + format", () => {
  it("rounds half away from zero", () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(roundHalfAwayFromZero(2.4)).toBe(2);
  });

  it("formats with two decimals", () => {
    expect(format(fromMinor(10050, "ZAR"))).toBe("ZAR 100.50");
    expect(format(fromMinor(-5, "USD"))).toBe("-USD 0.05");
  });
});
