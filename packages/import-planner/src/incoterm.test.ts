import { describe, it, expect } from "vitest";
import { incotermAdvice, incotermResponsibilities } from "./incoterm";

describe("incoterm advice (import-planner.md §6)", () => {
  it("recommends FOB/FCA", () => {
    expect(incotermAdvice("FOB").recommended).toBe(true);
    expect(incotermAdvice("FCA").recommended).toBe(true);
    expect(incotermAdvice("CIF").recommended).toBe(false);
  });
  it("warns on EXW (buyer handles foreign export clearance)", () => {
    expect(incotermAdvice("EXW").warnings.join(" ")).toMatch(/export clearance/i);
  });
  it("warns on China DDP door-to-door", () => {
    expect(incotermAdvice("DDP").warnings.join(" ")).toMatch(/undervaluation|door-to-door/i);
  });
  it("flags CIF/CFR/DDP as needing itemised freight for the FOB value", () => {
    expect(incotermAdvice("CIF").needsItemisedFreight).toBe(true);
    expect(incotermAdvice("CFR").needsItemisedFreight).toBe(true);
    expect(incotermAdvice("DDP").needsItemisedFreight).toBe(true);
    expect(incotermAdvice("FOB").needsItemisedFreight).toBe(false);
  });
  it("assigns duty/VAT to the buyer under DAP, to the seller under DDP", () => {
    expect(incotermResponsibilities("DAP").dutyVatClearance).toBe("buyer");
    expect(incotermResponsibilities("DDP").dutyVatClearance).toBe("seller");
    expect(incotermResponsibilities("EXW").originClearanceTHC).toBe("buyer");
  });
});
