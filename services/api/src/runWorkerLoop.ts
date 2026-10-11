import type { ProcessResult } from "@easy-logi/workflows";
import { runWorkerOnce, type RunWorkerOptions } from "./worker";

/**
 * Long-running loop that drains the `events` queue on an interval. A per-tick failure is isolated
 * (reported via `onError`) so the loop keeps running; it stops cleanly when the `signal` aborts or
 * `maxTicks` is reached. `tick` and `sleep` are injectable so the loop is unit-tested without a
 * live Supabase.
 *
 * Deployment options (all cred-independent — they read SUPABASE_SERVICE_ROLE_KEY from the env):
 *  - run this loop as a small always-on Node service / container;
 *  - or call `runWorkerOnce` from a Supabase Edge Function invoked by `pg_cron` on a schedule.
 */
export interface WorkerLoopOptions {
  intervalMs?: number;
  /** Defaults to one `runWorkerOnce` drain. Override in tests. */
  tick?: () => Promise<ProcessResult[] | unknown>;
  worker?: RunWorkerOptions;
  signal?: AbortSignal;
  /** Stop after this many ticks (mainly for tests / bounded runs). */
  maxTicks?: number;
  onError?: (err: unknown) => void;
  onTick?: (results: ProcessResult[] | unknown, tick: number) => void;
  /** Injectable, abortable sleep. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function runWorkerLoop(options: WorkerLoopOptions = {}): Promise<{ ticks: number }> {
  const intervalMs = options.intervalMs ?? 2_000;
  const tick = options.tick ?? (() => runWorkerOnce(options.worker));
  const sleep = options.sleep ?? defaultSleep;
  const { signal, maxTicks, onError, onTick } = options;

  let ticks = 0;
  while (!signal?.aborted && (maxTicks === undefined || ticks < maxTicks)) {
    try {
      const results = await tick();
      onTick?.(results, ticks + 1);
    } catch (err) {
      onError?.(err);
    }
    ticks++;

    const more = maxTicks === undefined || ticks < maxTicks;
    if (more && !signal?.aborted) {
      await sleep(intervalMs, signal);
    }
  }
  return { ticks };
}
