import { describe, it, expect } from "vitest";
import {
  ORDER_STATUSES,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
  TRANSITIONS,
  ROLES,
  type OrderStatus,
  type Role,
  allowedTransitions,
  canTransition,
  whoMayTrigger,
  requiresHuman,
  isTerminal,
  transition,
  assertCanTransition,
  TransitionError,
} from "./statusMachine";

const HAPPY_PATH: OrderStatus[] = [
  "requested",
  "fitment_in_progress",
  "matched",
  "rfq_sent",
  "quoted",
  "po_issued",
  "deposit_paid",
  "in_production",
  "qc_pending",
  "qc_passed",
  "balance_paid",
  "at_consolidation",
  "in_transit",
  "at_port_durban",
  "customs_clearance",
  "cleared",
  "in_transit_road",
  "delivered",
  "fit_confirmed",
  "closed",
];

describe("status set", () => {
  it("has no duplicate statuses", () => {
    expect(new Set(ORDER_STATUSES).size).toBe(ORDER_STATUSES.length);
  });

  it("partitions into active, terminal and out-of-band", () => {
    const outOfBand: OrderStatus[] = ["on_hold", "disputed"];
    const union = new Set<OrderStatus>([
      ...ACTIVE_STATUSES,
      ...TERMINAL_STATUSES,
      ...outOfBand,
    ]);
    expect(union).toEqual(new Set(ORDER_STATUSES));
    // disjoint
    expect(ACTIVE_STATUSES.some((s) => TERMINAL_STATUSES.includes(s))).toBe(false);
  });

  it("marks only closed and cancelled terminal", () => {
    for (const s of ORDER_STATUSES) {
      expect(isTerminal(s)).toBe(s === "closed" || s === "cancelled");
    }
  });
});

describe("happy path (human operator)", () => {
  it("walks requested -> closed via importer, each step allowed", () => {
    for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
      const from = HAPPY_PATH[i]!;
      const to = HAPPY_PATH[i + 1]!;
      const result = transition(from, to, "importer");
      expect(result.to).toBe(to);
    }
  });
});

describe("human-gated transitions (money / approval / customs)", () => {
  const gated: Array<[OrderStatus, OrderStatus]> = [
    ["fitment_in_progress", "matched"], // part-number approval
    ["quoted", "po_issued"], // PO
    ["po_issued", "deposit_paid"], // money
    ["qc_passed", "balance_paid"], // money
    ["customs_clearance", "cleared"], // customs submission
  ];

  it("are flagged requiresHuman", () => {
    for (const [from, to] of gated) {
      expect(requiresHuman(from, to)).toBe(true);
    }
  });

  it("reject the system role", () => {
    for (const [from, to] of gated) {
      expect(() => transition(from, to, "system")).toThrowError(TransitionError);
      expect(whoMayTrigger(from, to)).not.toContain("system");
    }
  });

  it("accept a human operator", () => {
    for (const [from, to] of gated) {
      expect(() => transition(from, to, "ops_admin")).not.toThrow();
    }
  });

  it("no other transition is accidentally human-gated", () => {
    const gatedKeys = new Set(gated.map(([f, t]) => `${f}->${t}`));
    for (const t of TRANSITIONS) {
      if (t.requiresHuman) {
        expect(gatedKeys.has(`${t.from}->${t.to}`)).toBe(true);
      }
    }
  });
});

describe("illegal transitions throw ILLEGAL_TRANSITION", () => {
  const illegal: Array<[OrderStatus, OrderStatus]> = [
    ["requested", "delivered"],
    ["requested", "closed"],
    ["requested", "po_issued"],
    ["fit_confirmed", "requested"],
    ["delivered", "requested"],
    ["delivered", "closed"], // must pass through fit_confirmed first (buyer confirmation)
    ["on_hold", "closed"],
    ["on_hold", "on_hold"],
    ["cleared", "qc_passed"],
    ["in_transit", "in_transit_road"], // must arrive at a port first
  ];

  it.each(illegal)("%s -> %s is rejected", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    const err = (() => {
      try {
        transition(from, to, "ops_admin");
      } catch (e) {
        return e as TransitionError;
      }
    })();
    expect(err).toBeInstanceOf(TransitionError);
    expect(err!.code).toBe("ILLEGAL_TRANSITION");
  });
});

describe("terminal states have no outgoing transitions", () => {
  it.each(TERMINAL_STATUSES)("%s is a dead end", (s) => {
    expect(allowedTransitions(s)).toEqual([]);
    for (const to of ORDER_STATUSES) {
      expect(canTransition(s, to)).toBe(false);
    }
  });
});

describe("on_hold", () => {
  it("is reachable from every active state by a human, not by buyer/system", () => {
    for (const from of ACTIVE_STATUSES) {
      expect(canTransition(from, "on_hold")).toBe(true);
      expect(assertCanTransition(from, "on_hold", "ops_admin")).toBe(true);
      expect(assertCanTransition(from, "on_hold", "buyer")).toBe(false);
      expect(assertCanTransition(from, "on_hold", "system")).toBe(false);
    }
  });

  it("resumes to any active state and can be cancelled", () => {
    for (const to of ACTIVE_STATUSES) {
      expect(assertCanTransition("on_hold", to, "importer")).toBe(true);
    }
    expect(assertCanTransition("on_hold", "cancelled", "ops_admin")).toBe(true);
  });

  it("cannot jump straight to a terminal success (closed)", () => {
    expect(canTransition("on_hold", "closed")).toBe(false);
  });
});

describe("disputed", () => {
  it("can be raised by a buyer from any active state", () => {
    for (const from of ACTIVE_STATUSES) {
      expect(assertCanTransition(from, "disputed", "buyer")).toBe(true);
    }
  });

  it("resolves to resume (active), closed, or cancelled by a human only", () => {
    expect(assertCanTransition("disputed", "cleared", "ops_admin")).toBe(true);
    expect(assertCanTransition("disputed", "closed", "ops_admin")).toBe(true);
    expect(assertCanTransition("disputed", "cancelled", "importer")).toBe(true);
    expect(assertCanTransition("disputed", "closed", "buyer")).toBe(false);
    expect(assertCanTransition("disputed", "closed", "system")).toBe(false);
  });
});

describe("role gating is explicit for every transition", () => {
  it("every transition lists at least one role and only valid roles", () => {
    for (const t of TRANSITIONS) {
      expect(t.roles.length).toBeGreaterThan(0);
      for (const r of t.roles) {
        expect(ROLES).toContain(r);
      }
    }
  });

  it("a role not on the list is rejected with ROLE_NOT_PERMITTED", () => {
    // buyer may not start fitment
    const err = (() => {
      try {
        transition("requested", "fitment_in_progress", "buyer");
      } catch (e) {
        return e as TransitionError;
      }
    })();
    expect(err!.code).toBe("ROLE_NOT_PERMITTED");
  });
});

describe("Phase 0.5 backbone additions", () => {
  it("clears customs at the arrival port, then the road leg to delivery", () => {
    expect(assertCanTransition("in_transit", "at_port_durban", "system")).toBe(true);
    expect(assertCanTransition("in_transit", "at_port_maputo", "system")).toBe(true);
    // both ports clear customs before the road leg
    expect(assertCanTransition("at_port_durban", "customs_clearance", "system")).toBe(true);
    expect(assertCanTransition("at_port_maputo", "customs_clearance", "system")).toBe(true);
    expect(assertCanTransition("cleared", "in_transit_road", "system")).toBe(true);
    expect(assertCanTransition("in_transit_road", "delivered", "system")).toBe(true);
    // cannot road before clearing customs, nor skip the port
    expect(canTransition("at_port_durban", "in_transit_road")).toBe(false);
    expect(canTransition("in_transit", "customs_clearance")).toBe(false);
  });

  it("gates both payments to a human (deposit and balance)", () => {
    expect(requiresHuman("po_issued", "deposit_paid")).toBe(true);
    expect(requiresHuman("qc_passed", "balance_paid")).toBe(true);
    expect(assertCanTransition("po_issued", "deposit_paid", "system")).toBe(false);
    expect(assertCanTransition("qc_passed", "balance_paid", "system")).toBe(false);
  });

  it("matched replaces the early fit_confirmed as the fitment-complete state", () => {
    expect(requiresHuman("fitment_in_progress", "matched")).toBe(true);
    expect(canTransition("fitment_in_progress", "fit_confirmed")).toBe(false);
    expect(canTransition("matched", "rfq_sent")).toBe(true);
  });

  it("fit_confirmed is the post-delivery buyer confirmation before closing", () => {
    expect(assertCanTransition("delivered", "fit_confirmed", "buyer")).toBe(true);
    expect(assertCanTransition("fit_confirmed", "closed", "buyer")).toBe(true);
    // the buyer confirmation is not money/approval/customs, so it is not requiresHuman-gated
    expect(requiresHuman("delivered", "fit_confirmed")).toBe(false);
  });

  it("qc_pending sits between production and QC sign-off", () => {
    expect(canTransition("in_production", "qc_pending")).toBe(true);
    expect(canTransition("qc_pending", "qc_passed")).toBe(true);
    expect(canTransition("in_production", "qc_passed")).toBe(false);
  });
});

describe("exhaustive table consistency", () => {
  it("canTransition agrees with the transition table for all pairs", () => {
    const defined = new Set(TRANSITIONS.map((t) => `${t.from}->${t.to}`));
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        expect(canTransition(from, to)).toBe(defined.has(`${from}->${to}`));
      }
    }
  });

  it("no self-transitions are defined", () => {
    for (const t of TRANSITIONS) {
      expect(t.from).not.toBe(t.to);
    }
  });

  it("for every defined transition, a permitted role succeeds and a forbidden role throws", () => {
    for (const t of TRANSITIONS) {
      const permitted = t.roles[0]!;
      expect(transition(t.from, t.to, permitted).to).toBe(t.to);

      const forbidden = (ROLES as readonly Role[]).find((r) => !t.roles.includes(r));
      if (forbidden) {
        expect(() => transition(t.from, t.to, forbidden)).toThrowError(TransitionError);
      }
    }
  });
});
