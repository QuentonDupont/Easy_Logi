import { describe, it, expect, beforeAll } from "vitest";
import { mockFitmentData } from "../mock/backend";
import { matchByNumber } from "./retrieve";
import { offlineLabelRead } from "./offline";
import { runFitmentFromPhoto } from "./pipeline";

const data = mockFitmentData();

beforeAll(() => {
  delete process.env.ANTHROPIC_API_KEY; // force the offline model path
});

describe("matchByNumber", () => {
  it("finds a catalogue part by its exact number", () => {
    const out = matchByNumber(["90915-YZZE1"], data);
    expect(out.some((c) => c.partId === "p-oilfilter-corolla")).toBe(true);
  });

  it("tolerates spacing/dash differences in the read number", () => {
    const out = matchByNumber(["90915 YZZE1"], data);
    expect(out.some((c) => c.partNumber === "90915-YZZE1")).toBe(true);
  });

  it("returns nothing for a number not in the catalogue", () => {
    expect(matchByNumber(["ZZZ-000"], data).length).toBe(0);
  });
});

describe("offlineLabelRead", () => {
  it("reads a known sample label", () => {
    const r = offlineLabelRead({ sampleId: "toyota-oil" });
    expect(r.brand).toBe("Toyota");
    expect(r.numbers).toContain("90915-YZZE1");
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("is low-confidence for an unknown/absent sample (no image, no key)", () => {
    expect(offlineLabelRead({}).confidence).toBeLessThan(0.5);
  });
});

describe("runFitmentFromPhoto (offline, sample)", () => {
  it("reads the label and surfaces the matching catalogue part", async () => {
    const r = await runFitmentFromPhoto({ sampleId: "toyota-oil", data });
    expect(r.usedRealModel).toBe(false);
    expect(r.labelRead?.numbers).toContain("90915-YZZE1");
    expect(r.candidates.some((c) => c.partNumber === "90915-YZZE1")).toBe(true);
    const agents = r.runs.map((x) => x.agent);
    expect(agents).toContain("part-label-reader");
    expect(agents).toContain("fitment-ranker");
  });

  it("never surfaces a part number outside the catalogue", async () => {
    const known = new Set(data.parts.map((p) => p.part_number));
    const r = await runFitmentFromPhoto({ sampleId: "vw-clutch", data });
    expect(r.candidates.every((c) => known.has(c.partNumber))).toBe(true);
  });
});
