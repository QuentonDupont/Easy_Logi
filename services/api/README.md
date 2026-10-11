# services/api

Trusted server-side entrypoints: the queue worker, webhooks, and edge functions. Everything here
runs with the Supabase **service role** (bypasses RLS) and must never run in the browser.

## Event-queue worker

`runWorkerOnce()` drains one batch from the `events` pgmq queue and processes each message through
the dispatcher (`services/workflows`). Intended to be invoked by `pg_cron` or a Supabase Edge
Function on a short interval, or from a long-running loop.

```ts
import { runWorkerOnce } from "@easy-logi/api";

// in an edge function / cron entrypoint
const results = await runWorkerOnce({ qty: 10, visibilityTimeoutSec: 30 });
```

Pieces:

- `supabaseAdmin.ts` — service-role client (reads `NEXT_PUBLIC_SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY`).
- `queueConsumer.ts` — `QueueConsumer` over the pgmq public wrappers
  (`queue_read` / `queue_delete` / `queue_archive`, migration `20261011090007`, service-role only).
- `eventRepo.ts` — loads events, marks them processed, publishes idempotent follow-ups.
- `agentRunner.ts` — agent registry (empty until Phase 1 agents register here).
- `worker.ts` — wires the adapters to `processBatch`.

The decision logic (idempotency, dispatch, poison-message handling) is the pure, unit-tested core in
`services/workflows/src/worker.ts`; the files here are thin Supabase adapters.

> **Not yet run** in this environment (no live Supabase). Apply the migrations, then wire
> `runWorkerOnce` to an Edge Function or cron entrypoint. The adapters cast the `queue_*` RPCs until
> `database.types.ts` is regenerated from the applied schema.

Later phases add the inbound webhooks (WhatsApp buyers, supplier email) here too.
