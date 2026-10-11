import { describe, it, expect } from "vitest";
import { statusLabel, statusBadgeVariant, nextStatusOptions } from "./status";

describe("statusLabel", () => {
  it("humanises snake_case statuses", () => {
    expect(statusLabel("fitment_in_progress")).toBe("Fitment In Progress");
    expect(statusLabel("po_issued")).toBe("Po Issued");
  });
});

describe("statusBadgeVariant", () => {
  it("colours success / warning / destructive families", () => {
    expect(statusBadgeVariant("delivered")).toBe("success");
    expect(statusBadgeVariant("on_hold")).toBe("warning");
    expect(statusBadgeVariant("cancelled")).toBe("destructive");
    expect(statusBadgeVariant("requested")).toBe("default");
  });
});

describe("nextStatusOptions", () => {
  it("offers an importer only the transitions they may trigger", () => {
    const opts = nextStatusOptions("requested", "importer");
    expect(opts).toContain("fitment_in_progress");
    expect(opts).toContain("on_hold");
    expect(opts).toContain("cancelled");
    // buyer-raiseable disputed is also open to importer
    expect(opts).toContain("disputed");
  });

  it("offers nothing from a terminal status", () => {
    expect(nextStatusOptions("closed", "ops_admin")).toEqual([]);
    expect(nextStatusOptions("cancelled", "ops_admin")).toEqual([]);
  });

  it("does not offer a human-gated transition to a role that cannot trigger it", () => {
    // 'buyer' cannot start fitment; the UI must not offer it.
    expect(nextStatusOptions("requested", "buyer")).not.toContain("fitment_in_progress");
  });
});
