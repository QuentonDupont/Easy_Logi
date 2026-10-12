import { describe, it, expect, beforeAll } from "vitest";
import { mockFitmentData } from "../mock/backend";
import { runFitmentPipeline } from "./pipeline";

const data = mockFitmentData();

beforeAll(() => {
  // Force the deterministic offline model path (no real API calls in tests).
  delete process.env.ANTHROPIC_API_KEY;
});

describe("runFitmentPipeline (offline)", () => {
  it("resolves a clear request to the right part via the agent loop", async () => {
    const r = await runFitmentPipeline({
      requestText: "Front brake pads for a 2018 Toyota Hilux 2.8",
      data,
    });
    expect(r.usedRealModel).toBe(false);
    expect(r.intent?.make).toBe("Toyota");
    expect(r.intent?.model).toBe("Hilux");
    expect(r.intent?.category).toBe("brakes");
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates[0]?.partNumber).toBe("04465-0K290");
    // intent-extractor + fitment-ranker both ran.
    expect(r.runs.map((x) => x.agent)).toContain("part-intent-extractor");
    expect(r.runs.map((x) => x.agent)).toContain("fitment-ranker");
  });

  it("asks a clarifying question when the request is too vague", async () => {
    const r = await runFitmentPipeline({ requestText: "I need a part please", data });
    expect(r.clarification).not.toBeNull();
    expect(r.clarification?.options.length).toBeGreaterThanOrEqual(2);
    expect(r.candidates.length).toBe(0);
    expect(r.runs.map((x) => x.agent)).toContain("clarifier");
  });

  it("never returns a part number outside the catalogue", async () => {
    const known = new Set(data.parts.map((p) => p.part_number));
    const r = await runFitmentPipeline({ requestText: "oil filter for a Toyota Corolla 1.6", data });
    expect(r.candidates.every((c) => known.has(c.partNumber))).toBe(true);
  });
});
