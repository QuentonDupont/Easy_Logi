import { describe, it, expect } from "vitest";
import { MODEL_IDS, EFFORT_BY_TIER, resolveModel } from "./models";

describe("model resolution", () => {
  it("maps tiers to the current Claude 5 family ids", () => {
    expect(resolveModel("haiku")).toBe("claude-haiku-5-5");
    expect(resolveModel("sonnet")).toBe("claude-sonnet-5-5");
    expect(MODEL_IDS.haiku).toBe("claude-haiku-5-5");
  });

  it("runs extract/classify cheap and judgment a notch higher", () => {
    expect(EFFORT_BY_TIER.haiku).toBe("low");
    expect(EFFORT_BY_TIER.sonnet).toBe("medium");
  });
});
