import type { QueueConsumer, QueueMessage } from "@easy-logi/workflows";
import { EVENTS_QUEUE } from "@easy-logi/workflows";
import type { AdminClient } from "./supabaseAdmin";

/**
 * QueueConsumer backed by the pgmq public wrappers (migration 20261011090007), callable only by
 * the service role. Reads with a visibility timeout so an in-flight message is hidden from other
 * workers until it is acked (deleted) or the timeout lapses and it is redelivered.
 */
export function createSupabaseQueueConsumer(
  client: AdminClient,
  queueName: string = EVENTS_QUEUE,
): QueueConsumer {
  return {
    async read(qty, visibilityTimeoutSec) {
      const { data, error } = await client.rpc("queue_read", {
        queue_name: queueName,
        vt: visibilityTimeoutSec,
        qty,
      });
      if (error) throw new Error(`queue_read failed: ${error.message}`);
      return (data ?? []).map(
        (row): QueueMessage => ({
          msgId: row.msg_id,
          readCount: row.read_ct,
          body: row.message as QueueMessage["body"],
        }),
      );
    },
    async ack(msgId) {
      const { error } = await client.rpc("queue_delete", {
        queue_name: queueName,
        msg_id: msgId,
      });
      if (error) throw new Error(`queue_delete failed: ${error.message}`);
    },
    async archive(msgId) {
      const { error } = await client.rpc("queue_archive", {
        queue_name: queueName,
        msg_id: msgId,
      });
      if (error) throw new Error(`queue_archive failed: ${error.message}`);
    },
  };
}
