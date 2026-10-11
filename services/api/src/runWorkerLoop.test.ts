import { describe, it, expect, vi } from "vitest";
import { runWorkerLoop, defaultSleep } from "./runWorkerLoop";

const noSleep = () => Promise.resolve();

describe("runWorkerLoop", () => {
  it("runs exactly maxTicks times", async () => {
    const tick = vi.fn(async () => []);
    const { ticks } = await runWorkerLoop({ tick, sleep: noSleep, maxTicks: 3 });
    expect(ticks).toBe(3);
    expect(tick).toHaveBeenCalledTimes(3);
  });

  it("isolates a failing tick and keeps going", async () => {
    let n = 0;
    const tick = vi.fn(async () => {
      n++;
      if (n === 2) throw new Error("boom");
      return [];
    });
    const onError = vi.fn();
    const { ticks } = await runWorkerLoop({ tick, sleep: noSleep, maxTicks: 3, onError });
    expect(ticks).toBe(3);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("stops promptly when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const tick = vi.fn(async () => []);
    const { ticks } = await runWorkerLoop({ tick, sleep: noSleep, signal: controller.signal });
    expect(ticks).toBe(0);
    expect(tick).not.toHaveBeenCalled();
  });

  it("stops when the signal aborts mid-run", async () => {
    const controller = new AbortController();
    let n = 0;
    const tick = vi.fn(async () => {
      n++;
      if (n === 2) controller.abort();
      return [];
    });
    const { ticks } = await runWorkerLoop({
      tick,
      sleep: noSleep,
      signal: controller.signal,
      maxTicks: 100,
    });
    expect(ticks).toBe(2);
  });

  it("does not sleep after the final tick", async () => {
    const sleep = vi.fn(noSleep);
    await runWorkerLoop({ tick: async () => [], sleep, maxTicks: 2 });
    // sleeps between ticks only: after tick 1, not after tick 2
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("reports results to onTick with a 1-based index", async () => {
    const onTick = vi.fn();
    await runWorkerLoop({ tick: async () => ["r"], sleep: noSleep, maxTicks: 2, onTick });
    expect(onTick).toHaveBeenNthCalledWith(1, ["r"], 1);
    expect(onTick).toHaveBeenNthCalledWith(2, ["r"], 2);
  });
});

describe("defaultSleep", () => {
  it("resolves after the timer", async () => {
    const start = Date.now();
    await defaultSleep(10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(5);
  });

  it("resolves immediately when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const start = Date.now();
    await defaultSleep(10_000, controller.signal);
    expect(Date.now() - start).toBeLessThan(500); // did not wait the full 10s
  });

  it("resolves early when aborted mid-wait", async () => {
    const controller = new AbortController();
    const start = Date.now();
    const p = defaultSleep(10_000, controller.signal);
    controller.abort();
    await p;
    expect(Date.now() - start).toBeLessThan(500);
  });
});
