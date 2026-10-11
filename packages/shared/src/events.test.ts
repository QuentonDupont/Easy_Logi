import { describe, it, expect } from "vitest";
import { makeEvent, eventEnvelopeSchema, EVENT_NAMES } from "./events";

describe("events", () => {
  it("builds a valid order.created event", () => {
    const e = makeEvent({
      name: "order.created",
      orgId: "22222222-2222-2222-2222-222222222222",
      orderId: "11111111-1111-1111-1111-111111111111",
      payload: { reference: "EL-0001" },
    });
    expect(e.name).toBe("order.created");
    expect(e.payload.reference).toBe("EL-0001");
    expect(eventEnvelopeSchema.safeParse(e).success).toBe(true);
  });

  it("defaults payload to an empty object and orderId to null", () => {
    const e = makeEvent({
      name: "order.status_changed",
      orgId: "22222222-2222-2222-2222-222222222222",
    });
    expect(e.payload).toEqual({});
    expect(e.orderId).toBeNull();
  });

  it("rejects an unknown event name", () => {
    expect(
      eventEnvelopeSchema.safeParse({
        name: "order.exploded",
        orgId: "22222222-2222-2222-2222-222222222222",
      }).success,
    ).toBe(false);
  });

  it("has no duplicate event names", () => {
    expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length);
  });
});
