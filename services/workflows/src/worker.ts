import { makeEvent, type EventEnvelope, type EventName } from "@easy-logi/shared";
import { planNext, type NextAction } from "./dispatcher";

/**
 * The event-queue worker. It drains the `events` pgmq queue, decides what runs next via the
 * dispatcher (plain code — CLAUDE.md "Agent rules"), and acks/archives messages. The core here is
 * pure and port-driven so it is unit-testable; the Supabase-backed adapters live in services/api.
 *
 * Idempotency: an event whose row is already `processed_at` is acked and skipped, so redelivery is
 * safe. A message that keeps failing is archived (dead-letter) after MAX_DELIVERIES attempts
 * instead of looping forever.
 */

/** An event row as loaded from the `events` table. */
export interface StoredEvent extends EventEnvelope {
  id: string;
  processedAt: string | null;
}

/** A message read off the pgmq queue. */
export interface QueueMessage {
  msgId: number;
  /** pgmq read_ct — how many times this message has been delivered. */
  readCount: number;
  body: { eventId: string; name: string };
}

export interface QueueConsumer {
  read(qty: number, visibilityTimeoutSec: number): Promise<QueueMessage[]>;
  /** Remove a message from the queue (successful handling). */
  ack(msgId: number): Promise<void>;
  /** Move a message to the archive / dead-letter table (poison message). */
  archive(msgId: number): Promise<void>;
}

export interface EventRepo {
  load(eventId: string): Promise<StoredEvent | null>;
  markProcessed(eventId: string): Promise<void>;
  /** Persist and enqueue a follow-up event (idempotent on its dedupeKey). */
  publish(event: EventEnvelope): Promise<void>;
}

export interface AgentRunner {
  /** Run the named agent for this event. `handled: false` means no agent is registered yet. */
  run(agentName: string, event: StoredEvent): Promise<{ handled: boolean }>;
}

export const MAX_DELIVERIES = 5;

export type ProcessOutcome =
  | "processed"
  | "skipped_duplicate"
  | "missing_event"
  | "archived_poison"
  | "requeued";

export interface ProcessResult {
  msgId: number;
  eventId: string;
  outcome: ProcessOutcome;
  actions: NextAction[];
}

export interface WorkerDeps {
  queue: QueueConsumer;
  events: EventRepo;
  agents: AgentRunner;
  /** Injectable planner (defaults to the dispatcher's planNext) so tests can drive every branch. */
  plan?: (event: StoredEvent) => NextAction[];
  /** Observe each processed message (metrics/logging). */
  onResult?: (result: ProcessResult) => void;
}

async function runAction(
  action: NextAction,
  event: StoredEvent,
  deps: WorkerDeps,
): Promise<void> {
  switch (action.type) {
    case "noop":
      return;
    case "emit_event": {
      if (!action.event) return;
      await deps.events.publish(
        makeEvent({
          name: action.event as EventName,
          orgId: event.orgId,
          orderId: event.orderId ?? null,
          // Deterministic key so a redelivery of the source event can't double-emit.
          dedupeKey: `${action.event}:${event.id}`,
        }),
      );
      return;
    }
    case "run_agent": {
      if (!action.agent) return;
      await deps.agents.run(action.agent, event);
      return;
    }
  }
}

/** Process a single queue message. Never throws for an expected miss; see outcomes. */
export async function processMessage(
  msg: QueueMessage,
  deps: WorkerDeps,
): Promise<ProcessResult> {
  const plan = deps.plan ?? planNext;
  const result = (outcome: ProcessOutcome, actions: NextAction[] = []): ProcessResult => {
    const r: ProcessResult = { msgId: msg.msgId, eventId: msg.body.eventId, outcome, actions };
    deps.onResult?.(r);
    return r;
  };

  try {
    const event = await deps.events.load(msg.body.eventId);

    // The event row is gone (deleted) — nothing to do; drop the message.
    if (!event) {
      await deps.queue.ack(msg.msgId);
      return result("missing_event");
    }

    // Already handled — idempotent redelivery.
    if (event.processedAt) {
      await deps.queue.ack(msg.msgId);
      return result("skipped_duplicate");
    }

    const actions = plan(event);
    for (const action of actions) {
      await runAction(action, event, deps);
    }

    await deps.events.markProcessed(event.id);
    await deps.queue.ack(msg.msgId);
    return result("processed", actions);
  } catch {
    // Failed this attempt. Archive if it has exhausted its retries, else leave it on the queue so
    // the visibility timeout redelivers it.
    if (msg.readCount >= MAX_DELIVERIES) {
      await deps.queue.archive(msg.msgId);
      return result("archived_poison");
    }
    return result("requeued");
  }
}

/** Read a batch and process each message. Returns one result per message. */
export async function processBatch(
  deps: WorkerDeps,
  opts: { qty?: number; visibilityTimeoutSec?: number } = {},
): Promise<ProcessResult[]> {
  const qty = opts.qty ?? 10;
  const vt = opts.visibilityTimeoutSec ?? 30;
  const messages = await deps.queue.read(qty, vt);
  const results: ProcessResult[] = [];
  for (const msg of messages) {
    results.push(await processMessage(msg, deps));
  }
  return results;
}
