import { describe, it, expect } from "vitest";
import { ORDER_STATUSES } from "@easy-logi/shared";
import { STATUS_PILL_TONE, statusLabel, type PillTone } from "./StatusPill";

const TONES: readonly PillTone[] = ["action", "neutral", "transit", "cleared", "dispute"];

describe("STATUS_PILL_TONE", () => {
  it("assigns a tone to every order status (exhaustive)", () => {
    for (const status of ORDER_STATUSES) {
      expect(STATUS_PILL_TONE[status], `missing tone for ${status}`).toBeDefined();
      expect(TONES, `invalid tone for ${status}`).toContain(STATUS_PILL_TONE[status]);
    }
  });

  it("has no tones for statuses that are not in ORDER_STATUSES", () => {
    const known = new Set<string>(ORDER_STATUSES);
    for (const key of Object.keys(STATUS_PILL_TONE)) {
      expect(known.has(key), `stale tone key ${key}`).toBe(true);
    }
  });

  it("maps the money/approval gates to the needs-action tone", () => {
    expect(STATUS_PILL_TONE.matched).toBe("action");
    expect(STATUS_PILL_TONE.quoted).toBe("action");
    expect(STATUS_PILL_TONE.qc_pending).toBe("action");
    expect(STATUS_PILL_TONE.on_hold).toBe("action");
  });

  it("maps logistics movement to the transit tone and port→road inclusive", () => {
    expect(STATUS_PILL_TONE.in_transit).toBe("transit");
    expect(STATUS_PILL_TONE.at_port_durban).toBe("transit");
    expect(STATUS_PILL_TONE.at_port_maputo).toBe("transit");
    expect(STATUS_PILL_TONE.customs_clearance).toBe("transit");
    expect(STATUS_PILL_TONE.in_transit_road).toBe("transit");
  });

  it("maps positive completions to the cleared tone", () => {
    expect(STATUS_PILL_TONE.cleared).toBe("cleared");
    expect(STATUS_PILL_TONE.delivered).toBe("cleared");
    expect(STATUS_PILL_TONE.fit_confirmed).toBe("cleared");
    expect(STATUS_PILL_TONE.closed).toBe("cleared");
  });

  it("maps disputed and cancelled to the dispute tone", () => {
    expect(STATUS_PILL_TONE.disputed).toBe("dispute");
    expect(STATUS_PILL_TONE.cancelled).toBe("dispute");
  });
});

describe("statusLabel", () => {
  it("title-cases snake_case statuses", () => {
    expect(statusLabel("at_port_durban")).toBe("At Port Durban");
    expect(statusLabel("fit_confirmed")).toBe("Fit Confirmed");
    expect(statusLabel("requested")).toBe("Requested");
  });
});
