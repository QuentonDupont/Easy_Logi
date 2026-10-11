import { eventEnvelopeSchema, type EventEnvelope } from "@easy-logi/shared";
import { planNext, type NextAction } from "./dispatcher";

/**
 * Storage port for the event bus. The real implementation (services/api) inserts into the
 * `events` table and sends to the `events` pgmq queue via Supabase. Keeping it an interface
 * makes the bus unit-testable without a database, and idempotent on `dedupeKey` (rule: duplicate
 * deliveries must collapse to one effect).
 */
export interface EventStore {
  /**
   * Persist the event. Must be idempotent on (orgId, dedupeKey): if an event with the same
   * dedupeKey already exists, return { inserted: false } and do NOT create a duplicate.
   */
  insertEvent(event: EventEnvelope): Promise<{ inserted: boolean; id: string }>;
  /** Enqueue the stored event id for the dispatcher to consume. */
  enqueue(queue: string, message: { eventId: string; name: string }): Promise<void>;
}

export const EVENTS_QUEUE = "events";

export interface PublishResult {
  id: string;
  inserted: boolean;
  /** Planned follow-up actions (empty until the event is actually processed). */
  plan: NextAction[];
}

/**
 * Validate and publish an event: persist it, and enqueue it exactly once. A duplicate (same
 * dedupeKey) is persisted-once and NOT re-enqueued, so replays are safe.
 */
export async function publishEvent(
  store: EventStore,
  event: EventEnvelope,
): Promise<PublishResult> {
  const parsed = eventEnvelopeSchema.parse(event);
  const { inserted, id } = await store.insertEvent(parsed);
  if (inserted) {
    await store.enqueue(EVENTS_QUEUE, { eventId: id, name: parsed.name });
  }
  return { id, inserted, plan: inserted ? planNext(parsed) : [] };
}
