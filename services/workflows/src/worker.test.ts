import { describe, it, expect, vi } from "vitest";
import { makeEvent } from "@easy-logi/shared";
import type { NextAction } from "./dispatcher";
import {
  processMessage,
  processBatch,
  MAX_DELIVERIES,
  type QueueMessage,
  type StoredEvent,
  type WorkerDeps,
  type QueueConsumer,
  type EventRepo,
  type AgentRunner,
} from "./worker";

const ORG = "00000000-0000-0000-0000-0000000000a1";

function storedEvent(over: Partial<StoredEvent> = {}): StoredEvent {
  const base = makeEvent({ name: "order.created", orgId: ORG, orderId: null });
  return { id: "evt-1", processedAt: null, ...base, ...over };
}

function fakes(event: StoredEvent | null) {
  const acked: number[] = [];
  const archived: number[] = [];
  const marked: string[] = [];
  const published: string[] = [];
  const agentRuns: string[] = [];

  const queue: QueueConsumer = {
    async read() {
      return [];
    },
    async ack(id) {
      acked.push(id);
    },
    async archive(id) {
      archived.push(id);
    },
  };
  const events: EventRepo = {
    async load() {
      return event;
    },
    async markProcessed(id) {
      marked.push(id);
    },
    async publish(e) {
      published.push(e.name);
    },
  };
  const agents: AgentRunner = {
    async run(name) {
      agentRuns.push(name);
      return { handled: false };
    },
  };
  return { queue, events, agents, acked, archived, marked, published, agentRuns };
}

function msg(over: Partial<QueueMessage> = {}): QueueMessage {
  return { msgId: 1, readCount: 1, body: { eventId: "evt-1", name: "order.created" }, ...over };
}

describe("processMessage", () => {
  it("processes a noop event, marks it processed and acks", async () => {
    const f = fakes(storedEvent());
    const deps: WorkerDeps = { queue: f.queue, events: f.events, agents: f.agents };
    const res = await processMessage(msg(), deps);
    expect(res.outcome).toBe("processed");
    expect(f.marked).toEqual(["evt-1"]);
    expect(f.acked).toEqual([1]);
  });

  it("acks and skips an event already marked processed (idempotent)", async () => {
    const f = fakes(storedEvent({ processedAt: "2026-01-01T00:00:00Z" }));
    const deps: WorkerDeps = { queue: f.queue, events: f.events, agents: f.agents };
    const res = await processMessage(msg(), deps);
    expect(res.outcome).toBe("skipped_duplicate");
    expect(f.marked).toEqual([]); // not re-processed
    expect(f.acked).toEqual([1]);
  });

  it("acks and drops a message whose event row is gone", async () => {
    const f = fakes(null);
    const deps: WorkerDeps = { queue: f.queue, events: f.events, agents: f.agents };
    const res = await processMessage(msg(), deps);
    expect(res.outcome).toBe("missing_event");
    expect(f.acked).toEqual([1]);
  });

  it("publishes a follow-up for an emit_event action", async () => {
    const f = fakes(storedEvent());
    const plan = (): NextAction[] => [
      { type: "emit_event", event: "request.created", reason: "test" },
    ];
    const deps: WorkerDeps = { queue: f.queue, events: f.events, agents: f.agents, plan };
    const res = await processMessage(msg(), deps);
    expect(res.outcome).toBe("processed");
    expect(f.published).toEqual(["request.created"]);
  });

  it("invokes the agent runner for a run_agent action", async () => {
    const f = fakes(storedEvent());
    const plan = (): NextAction[] => [
      { type: "run_agent", agent: "message-classifier", reason: "test" },
    ];
    const deps: WorkerDeps = { queue: f.queue, events: f.events, agents: f.agents, plan };
    const res = await processMessage(msg(), deps);
    expect(res.outcome).toBe("processed");
    expect(f.agentRuns).toEqual(["message-classifier"]);
  });

  it("requeues (does not ack) on a transient failure below the delivery limit", async () => {
    const f = fakes(storedEvent());
    f.events.markProcessed = vi.fn(async () => {
      throw new Error("db blip");
    });
    const deps: WorkerDeps = { queue: f.queue, events: f.events, agents: f.agents };
    const res = await processMessage(msg({ readCount: 2 }), deps);
    expect(res.outcome).toBe("requeued");
    expect(f.acked).toEqual([]);
    expect(f.archived).toEqual([]);
  });

  it("archives a poison message after exhausting deliveries", async () => {
    const f = fakes(storedEvent());
    f.events.markProcessed = vi.fn(async () => {
      throw new Error("still failing");
    });
    const deps: WorkerDeps = { queue: f.queue, events: f.events, agents: f.agents };
    const res = await processMessage(msg({ readCount: MAX_DELIVERIES }), deps);
    expect(res.outcome).toBe("archived_poison");
    expect(f.archived).toEqual([1]);
  });
});

describe("processBatch", () => {
  it("reads a batch and processes each message", async () => {
    const f = fakes(storedEvent());
    f.queue.read = async () => [msg({ msgId: 1 }), msg({ msgId: 2 })];
    const onResult = vi.fn();
    const deps: WorkerDeps = {
      queue: f.queue,
      events: f.events,
      agents: f.agents,
      onResult,
    };
    const results = await processBatch(deps, { qty: 10 });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.outcome === "processed")).toBe(true);
    expect(onResult).toHaveBeenCalledTimes(2);
  });
});
