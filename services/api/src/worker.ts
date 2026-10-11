import { processBatch, type ProcessResult, type WorkerDeps } from "@easy-logi/workflows";
import { createAdminClient } from "./supabaseAdmin";
import { createSupabaseQueueConsumer } from "./queueConsumer";
import { createSupabaseEventRepo } from "./eventRepo";
import { createAgentRunner, type RegisteredAgent } from "./agentRunner";

export interface RunWorkerOptions {
  qty?: number;
  visibilityTimeoutSec?: number;
  /** Agent registry; empty until Phase 1 agents are wired. */
  agents?: Record<string, RegisteredAgent>;
}

/**
 * Drain one batch from the `events` queue and process it. Intended to be invoked by a scheduled
 * trigger (pg_cron / an edge function) or a long-running worker loop — NOT from the browser; it
 * uses the service-role client.
 *
 * NOTE: not yet run in this environment (no live Supabase). Wire it to a Supabase Edge Function or
 * a cron entrypoint once the migrations are applied.
 */
export async function runWorkerOnce(options: RunWorkerOptions = {}): Promise<ProcessResult[]> {
  const client = createAdminClient();
  const deps: WorkerDeps = {
    queue: createSupabaseQueueConsumer(client),
    events: createSupabaseEventRepo(client),
    agents: createAgentRunner(options.agents ?? {}),
    onResult: (r) =>
      console.info(`[worker] msg ${r.msgId} event ${r.eventId} -> ${r.outcome}`),
  };
  return processBatch(deps, {
    qty: options.qty,
    visibilityTimeoutSec: options.visibilityTimeoutSec,
  });
}
