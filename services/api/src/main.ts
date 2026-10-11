/**
 * Worker entrypoint: `pnpm --filter @easy-logi/api worker` (or root `pnpm worker`).
 * Runs the event-queue loop until SIGINT/SIGTERM, then shuts down cleanly.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
import { runWorkerLoop } from "./runWorkerLoop";

// Guard against a non-numeric / zero env value, which would otherwise turn the loop into a
// ~0ms hot drain.
const parsedInterval = Number(process.env.WORKER_INTERVAL_MS);
const intervalMs = Number.isFinite(parsedInterval) && parsedInterval > 0 ? parsedInterval : 2_000;

async function main(): Promise<void> {
  const controller = new AbortController();
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      console.info(`[worker] ${sig} received, shutting down…`);
      controller.abort();
    });
  }

  console.info(`[worker] starting; draining events every ${intervalMs}ms`);
  const { ticks } = await runWorkerLoop({
    intervalMs,
    signal: controller.signal,
    onError: (err) =>
      console.error("[worker] tick failed:", err instanceof Error ? err.message : err),
  });
  console.info(`[worker] stopped after ${ticks} ticks`);
}

main().catch((err: unknown) => {
  console.error("[worker] fatal:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
