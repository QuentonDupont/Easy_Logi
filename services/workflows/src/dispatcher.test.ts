import { describe, it, expect } from "vitest";
import { makeEvent } from "@easy-logi/shared";
import { planNext } from "./dispatcher";
import { publishEvent, type EventStore } from "./eventBus";

const ORG = "00000000-0000-0000-0000-0000000000a1";

describe("planNext", () => {
  it("returns a no-op for a registered Phase 0 event", () => {
    const plan = planNext(makeEvent({ name: "order.created", orgId: ORG }));
    expect(plan).toHaveLength(1);
    expect(plan[0]!.type).toBe("noop");
  });

  it("returns a no-op with a reason for an unregistered event", () => {
    const plan = planNext(makeEvent({ name: "claim.opened", orgId: ORG }));
    expect(plan[0]!.type).toBe("noop");
    expect(plan[0]!.reason).toContain("no workflow registered");
  });
});

/** In-memory EventStore that enforces idempotency on dedupeKey, like the real table. */
function fakeStore() {
  const byDedupe = new Map<string, string>();
  const enqueued: Array<{ eventId: string; name: string }> = [];
  let seq = 0;
  const store: EventStore = {
    async insertEvent(event) {
      const key = event.dedupeKey ? `${event.orgId}:${event.dedupeKey}` : null;
      if (key && byDedupe.has(key)) {
        return { inserted: false, id: byDedupe.get(key)! };
      }
      const id = `evt-${++seq}`;
      if (key) byDedupe.set(key, id);
      return { inserted: true, id };
    },
    async enqueue(_queue, message) {
      enqueued.push(message);
    },
  };
  return { store, enqueued };
}

describe("publishEvent", () => {
  it("inserts and enqueues a new event once, and plans follow-up", async () => {
    const { store, enqueued } = fakeStore();
    const res = await publishEvent(
      store,
      makeEvent({ name: "order.created", orgId: ORG, dedupeKey: "order-1-created" }),
    );
    expect(res.inserted).toBe(true);
    expect(enqueued).toHaveLength(1);
    expect(res.plan[0]!.type).toBe("noop");
  });

  it("is idempotent: a duplicate dedupeKey is not enqueued again", async () => {
    const { store, enqueued } = fakeStore();
    const e = makeEvent({ name: "order.created", orgId: ORG, dedupeKey: "dupe" });
    const first = await publishEvent(store, e);
    const second = await publishEvent(store, e);
    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(second.plan).toEqual([]);
    expect(enqueued).toHaveLength(1); // only the first delivery enqueued
  });
});
