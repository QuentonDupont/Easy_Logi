import { describe, it, expect } from "vitest";
import type { PartIntent } from "@easy-logi/agents";
import { mockFitmentData } from "../mock/backend";
import { retrieveCandidates } from "./retrieve";

const data = mockFitmentData();

function intent(partial: Partial<PartIntent>): PartIntent {
  return {
    make: null,
    model: null,
    year: null,
    category: null,
    position: null,
    descriptors: [],
    confidence: 0.9,
    reason: "test",
    ...partial,
  };
}

describe("retrieveCandidates", () => {
  it("puts the Hilux front brake pad on top for a Hilux brakes request", () => {
    const out = retrieveCandidates(
      intent({ make: "Toyota", model: "Hilux", year: 2018, category: "brakes", position: "front", descriptors: ["brake", "pads"] }),
      data,
    );
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]?.partNumber).toBe("04465-0K290");
  });

  it("finds the Corolla oil filter", () => {
    const out = retrieveCandidates(
      intent({ make: "Toyota", model: "Corolla", category: "engine_consumables", descriptors: ["oil", "filter"] }),
      data,
    );
    expect(out.some((c) => c.partNumber === "90915-YZZE1")).toBe(true);
  });

  it("only returns catalogue part numbers (never invents one)", () => {
    const out = retrieveCandidates(intent({ make: "Ford", model: "Ranger", category: "cooling", descriptors: ["radiator"] }), data);
    const known = new Set(data.parts.map((p) => p.part_number));
    expect(out.every((c) => known.has(c.partNumber))).toBe(true);
    expect(out.some((c) => c.partNumber === "AB39-8005-AA")).toBe(true);
  });

  it("returns nothing for a part category not stocked for any vehicle", () => {
    const out = retrieveCandidates(intent({ make: "Mahindra", model: "Bolero", category: "body", descriptors: ["bumper", "bracket"] }), data);
    expect(out.length).toBe(0);
  });
});
