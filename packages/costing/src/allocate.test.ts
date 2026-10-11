import { describe, it, expect } from "vitest";
import { allocateProportional } from "./allocate";
import { MoneyError } from "./money";

describe("allocateProportional", () => {
  it("splits exactly proportionally when divisible", () => {
    expect(allocateProportional(300, [1, 2])).toEqual([100, 200]);
  });

  it("uses largest remainder so parts always sum to total", () => {
    const parts = allocateProportional(1000, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(parts).toEqual([334, 333, 333]);
  });

  it("handles indivisible totals and keeps the sum invariant", () => {
    const parts = allocateProportional(10, [1, 1, 1]);
    expect(parts).toEqual([4, 3, 3]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it("allocates by an uneven weight vector", () => {
    const parts = allocateProportional(100, [3, 1]);
    expect(parts).toEqual([75, 25]);
  });

  it("splits evenly when all weights are zero", () => {
    const parts = allocateProportional(9, [0, 0, 0]);
    expect(parts).toEqual([3, 3, 3]);
  });

  it("never loses a cent across many lines", () => {
    const weights = [17, 3, 101, 59, 2];
    const parts = allocateProportional(99991, weights);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(99991);
    expect(parts.every((p) => p >= 0)).toBe(true);
  });

  it("rejects a non-integer total", () => {
    expect(() => allocateProportional(10.5, [1, 1])).toThrow(MoneyError);
  });

  it("rejects empty weights and negative weights", () => {
    expect(() => allocateProportional(10, [])).toThrow(MoneyError);
    expect(() => allocateProportional(10, [1, -1])).toThrow(MoneyError);
  });
});
