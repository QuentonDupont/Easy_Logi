import { describe, it, expect } from "vitest";
import {
  orderSchema,
  createOrderInputSchema,
  changeStatusInputSchema,
  parseOrQueue,
} from "./schemas";

const ORDER = {
  id: "11111111-1111-1111-1111-111111111111",
  orgId: "22222222-2222-2222-2222-222222222222",
  buyerId: null,
  reference: "EL-0001",
  status: "requested",
  summary: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("orderSchema", () => {
  it("accepts a valid order", () => {
    expect(orderSchema.parse(ORDER).reference).toBe("EL-0001");
  });

  it("rejects an unknown status", () => {
    expect(orderSchema.safeParse({ ...ORDER, status: "teleporting" }).success).toBe(false);
  });

  it("rejects a non-uuid id", () => {
    expect(orderSchema.safeParse({ ...ORDER, id: "nope" }).success).toBe(false);
  });
});

describe("createOrderInputSchema", () => {
  it("accepts minimal input", () => {
    const parsed = createOrderInputSchema.parse({
      orgId: "22222222-2222-2222-2222-222222222222",
    });
    expect(parsed.orgId).toBeDefined();
  });

  it("rejects a summary over the limit", () => {
    const bad = createOrderInputSchema.safeParse({
      orgId: "22222222-2222-2222-2222-222222222222",
      summary: "x".repeat(2001),
    });
    expect(bad.success).toBe(false);
  });
});

describe("changeStatusInputSchema", () => {
  it("accepts a valid change", () => {
    const parsed = changeStatusInputSchema.parse({
      orderId: "11111111-1111-1111-1111-111111111111",
      to: "fitment_in_progress",
      role: "ops_admin",
    });
    expect(parsed.to).toBe("fitment_in_progress");
  });

  it("rejects an invalid role", () => {
    expect(
      changeStatusInputSchema.safeParse({
        orderId: "11111111-1111-1111-1111-111111111111",
        to: "fitment_in_progress",
        role: "hacker",
      }).success,
    ).toBe(false);
  });
});

describe("parseOrQueue", () => {
  it("returns ok on valid data", () => {
    const res = parseOrQueue(orderSchema, ORDER);
    expect(res.ok).toBe(true);
  });

  it("returns issues on invalid data with no retry", () => {
    const res = parseOrQueue(orderSchema, { ...ORDER, status: "bad" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.issues.length).toBeGreaterThan(0);
  });

  it("uses the retry hook exactly once and can recover", () => {
    let calls = 0;
    const res = parseOrQueue(orderSchema, { ...ORDER, status: "bad" }, () => {
      calls++;
      return ORDER;
    });
    expect(calls).toBe(1);
    expect(res.ok).toBe(true);
  });

  it("fails after a retry that is still invalid", () => {
    const res = parseOrQueue(orderSchema, { ...ORDER, status: "bad" }, () => ({
      ...ORDER,
      status: "still-bad",
    }));
    expect(res.ok).toBe(false);
  });
});
