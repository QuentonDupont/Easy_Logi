import { describe, it, expect } from "vitest";
import { ORDER_STATUSES } from "@easy-logi/shared";
import { orderGroup, ORDER_TABS } from "./orders-filter";

describe("orderGroup", () => {
  it("classifies every status into a known group", () => {
    const groups = new Set(["action", "production", "port", "delivered", "other"]);
    for (const status of ORDER_STATUSES) {
      expect(groups.has(orderGroup(status)), `bad group for ${status}`).toBe(true);
    }
  });

  it("needs-action gates win over everything", () => {
    expect(orderGroup("matched")).toBe("action");
    expect(orderGroup("quoted")).toBe("action");
    expect(orderGroup("qc_pending")).toBe("action");
    expect(orderGroup("on_hold")).toBe("action");
  });

  it("ports map to port, delivered family to delivered", () => {
    expect(orderGroup("at_port_durban")).toBe("port");
    expect(orderGroup("at_port_maputo")).toBe("port");
    expect(orderGroup("delivered")).toBe("delivered");
    expect(orderGroup("fit_confirmed")).toBe("delivered");
    expect(orderGroup("closed")).toBe("delivered");
  });

  it("build/payment states map to production", () => {
    expect(orderGroup("in_production")).toBe("production");
    expect(orderGroup("deposit_paid")).toBe("production");
    expect(orderGroup("balance_paid")).toBe("production");
    expect(orderGroup("qc_passed")).toBe("production");
  });

  it("early + logistics-movement states fall through to other", () => {
    expect(orderGroup("requested")).toBe("other");
    expect(orderGroup("rfq_sent")).toBe("other");
    expect(orderGroup("in_transit")).toBe("other");
  });

  it("exposes the five filter tabs with All first", () => {
    expect(ORDER_TABS.map((t) => t.id)).toEqual(["all", "action", "production", "port", "delivered"]);
  });
});
