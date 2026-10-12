import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  partIntentPrompt,
  fitmentRankerPrompt,
  clarifierPrompt,
  AGENT_CONFIGS,
  partIntentSchema,
  fitmentRankerSchema,
  clarifierSchema,
} from "./index";

function readMd(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

describe("agent prompt.ts mirrors prompt.md (no drift)", () => {
  const cases: Array<[string, string, string]> = [
    ["part-intent-extractor", partIntentPrompt, "./part-intent-extractor/prompt.md"],
    ["fitment-ranker", fitmentRankerPrompt, "./fitment-ranker/prompt.md"],
    ["clarifier", clarifierPrompt, "./clarifier/prompt.md"],
  ];
  for (const [name, systemPrompt, mdPath] of cases) {
    it(`${name}: prompt.ts === prompt.md`, () => {
      expect(systemPrompt.trim()).toBe(readMd(mdPath).trim());
    });
  }
});

describe("agent configs are well-formed", () => {
  it("every config's name matches its registry key and budgets are sane", () => {
    for (const [key, config] of Object.entries(AGENT_CONFIGS)) {
      expect(config.name).toBe(key);
      expect(config.maxToolCalls).toBeLessThanOrEqual(2);
      expect(config.confidenceThreshold).toBeGreaterThanOrEqual(0);
      expect(config.confidenceThreshold).toBeLessThanOrEqual(1);
      expect(config.maxOutputTokens).toBeGreaterThan(0);
    }
  });
});

describe("agent schemas validate a well-formed output", () => {
  it("part-intent-extractor", () => {
    expect(
      partIntentSchema.safeParse({
        make: "Toyota",
        model: "Hilux",
        year: 2018,
        category: "brakes",
        position: "front",
        descriptors: ["brake", "pads"],
        confidence: 0.9,
        reason: "Clear vehicle and part.",
      }).success,
    ).toBe(true);
  });

  it("fitment-ranker", () => {
    expect(
      fitmentRankerSchema.safeParse({
        ranked: [{ partId: "p-1", partNumber: "04465-0K290", score: 0.9, reason: "Exact fit." }],
        confidence: 0.9,
        reason: "One strong candidate.",
      }).success,
    ).toBe(true);
  });

  it("clarifier", () => {
    expect(
      clarifierSchema.safeParse({
        question: "Which Hilux is it?",
        options: [
          { label: "2016-2024", value: "veh-hilux-24" },
          { label: "2005-2015", value: "veh-hilux-15" },
        ],
        confidence: 0.8,
        reason: "Two generations match.",
      }).success,
    ).toBe(true);
  });
});
