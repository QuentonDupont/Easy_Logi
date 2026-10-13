import { describe, it, expect } from "vitest";
import { classifyRows, countByStatus } from "./classify";
import type { ExistingPart, ParsedRow } from "./types";

function row(p: Partial<ParsedRow>): ParsedRow {
  return {
    rowNumber: 1,
    partNumber: "",
    brand: "",
    category: "",
    description: "",
    make: "",
    model: "",
    position: "",
    confidence: "",
    crossrefBrand: "",
    crossrefNumber: "",
    ...p,
  };
}

const existing: ExistingPart[] = [
  { part_number: "90915-YZZE1", brand: "Toyota", category: "engine_consumables", description: "Oil filter" },
];

describe("classifyRows", () => {
  it("flags new, duplicate-in-batch, conflict and invalid", () => {
    const staged = classifyRows(
      [
        row({ rowNumber: 1, partNumber: "NEW-1", brand: "Ford", category: "electrical", description: "Alternator", make: "Ford", model: "Ranger" }),
        row({ rowNumber: 2, partNumber: "new 1", brand: "Ford", category: "electrical", description: "Alternator" }),
        row({ rowNumber: 3, partNumber: "90915 YZZE1", brand: "Toyota", category: "suspension", description: "Mislabelled" }),
        row({ rowNumber: 4, partNumber: "", brand: "X", category: "" }),
      ],
      existing,
    );
    expect(staged[0]!.status).toBe("new");
    expect(staged[1]!.status).toBe("duplicate"); // same normalized number, repeated in file
    expect(staged[2]!.status).toBe("conflict"); // existing brand+number, different category
    expect(staged[3]!.status).toBe("invalid");
    expect(countByStatus(staged)).toMatchObject({ new: 1, duplicate: 1, conflict: 1, invalid: 1 });
  });

  it("treats an exact existing match as a duplicate", () => {
    const staged = classifyRows(
      [row({ partNumber: "90915-YZZE1", brand: "Toyota", category: "engine_consumables", description: "Oil filter" })],
      existing,
    );
    expect(staged[0]!.status).toBe("duplicate");
    expect(staged[0]!.message).toContain("already");
  });

  it("normalises confidence and optional fitment fields", () => {
    const staged = classifyRows(
      [row({ partNumber: "P1", brand: "B", category: "c", confidence: "0.85", make: "Toyota", model: "Hilux", position: "front" })],
      [],
    );
    expect(staged[0]!.confidence).toBe(0.85);
    expect(staged[0]!.make).toBe("Toyota");
    expect(staged[0]!.position).toBe("front");
  });

  it("drops an out-of-range confidence to null", () => {
    const staged = classifyRows([row({ partNumber: "P2", brand: "B", category: "c", confidence: "9" })], []);
    expect(staged[0]!.confidence).toBeNull();
  });
});
