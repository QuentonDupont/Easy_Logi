/**
 * `pnpm eval <agent>` — runs a runtime agent's JSONL golden set and reports accuracy/latency.
 *
 * Phase 0 ships no runtime agents, so this is a stub that explains the contract the
 * `eval-runner` subagent and Phase 1 agents will rely on. It reads
 * services/agents/<agent>/evals/*.jsonl and (in Phase 1) runs each case through the agent.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

function main(): void {
  const agent = process.argv[2];
  if (!agent) {
    console.error("Usage: pnpm eval <agent>");
    process.exit(1);
  }

  const dir = join("services", "agents", agent);
  if (!existsSync(dir)) {
    console.error(`No agent folder at ${dir}. Create it with the agent-builder subagent.`);
    process.exit(1);
  }

  console.info(
    `[eval] Agent "${agent}" found. Runtime agents arrive in Phase 1; ` +
      `this harness will then load evals/*.jsonl, run each case, and report ` +
      `accuracy, p50/p95 latency and token usage against the README target.`,
  );
}

main();
