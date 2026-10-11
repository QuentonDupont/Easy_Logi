import type { EventEnvelope } from "@easy-logi/shared";
import type { EventRepo, StoredEvent } from "@easy-logi/workflows";
import { EVENTS_QUEUE } from "@easy-logi/workflows";
import type { AdminClient } from "./supabaseAdmin";

/**
 * EventRepo backed by the `events` table + pgmq wrappers. Loads an event, marks it processed, and
 * publishes follow-up events (idempotent on the (org_id, dedupe_key) unique index — a duplicate
 * insert is swallowed and not re-enqueued).
 */
export function createSupabaseEventRepo(
  client: AdminClient,
  queueName: string = EVENTS_QUEUE,
): EventRepo {
  return {
    async load(eventId) {
      const { data, error } = await client
        .from("events")
        .select("id, name, org_id, order_id, payload, dedupe_key, processed_at")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw new Error(`load event failed: ${error.message}`);
      if (!data) return null;
      const stored: StoredEvent = {
        id: data.id,
        name: data.name as StoredEvent["name"],
        orgId: data.org_id,
        orderId: data.order_id,
        payload: data.payload ?? {},
        dedupeKey: data.dedupe_key ?? undefined,
        processedAt: data.processed_at,
      };
      return stored;
    },

    async markProcessed(eventId) {
      const { error } = await client
        .from("events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", eventId);
      if (error) throw new Error(`markProcessed failed: ${error.message}`);
    },

    async publish(event: EventEnvelope) {
      const { data, error } = await client
        .from("events")
        .insert({
          org_id: event.orgId,
          name: event.name,
          order_id: event.orderId ?? null,
          payload: event.payload,
          dedupe_key: event.dedupeKey ?? null,
        })
        .select("id")
        .maybeSingle();

      // Unique-violation on dedupe_key means it was already published — do not re-enqueue.
      if (error) {
        if (error.code === "23505") return;
        throw new Error(`publish insert failed: ${error.message}`);
      }
      if (!data) return;

      const { error: sendError } = await client.rpc("queue_send", {
        queue_name: queueName,
        msg: { eventId: data.id, name: event.name },
      });
      if (sendError) throw new Error(`queue_send failed: ${sendError.message}`);
    },
  };
}
