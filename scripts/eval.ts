/**
 * `pnpm eval <agent>` — run a runtime agent's JSONL golden set and report accuracy, latency and
 * tokens against its README target. The scoring logic lives in @easy-logi/agent-runtime
 * (runEvalSet); this file only discovers the agent folder, loads its config/prompt/schema, runs
 * the cases through the real model client, prints the report, and persists evals/last-result.json
 * so the next run can flag regressions.
 *
 * Requires ANTHROPIC_API_KEY (the eval actually calls the model). With no API key it will fail at
 * the first case — that is expected; evals cost tokens.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ZodType } from "zod";
import {
  createAnthropicModelClient,
  runEvalSet,
  parseEvalJsonl,
  type AgentConfig,
  type EvalCase,
  type EvalReport,
} from "@easy-logi/agent-runtime";

const LAST_RESULT = "last-result.json";

function fail(message: string): never {
  console.error(`[eval] ${message}`);
  process.exit(1);
}

async function loadAgent(dir: string): Promise<{
  config: AgentConfig;
  prompt: string;
  outputSchema: ZodType<unknown>;
  cases: EvalCase[];
  previousAccuracy?: number;
}> {
  for (const f of ["config.ts", "prompt.md", "schema.ts", "evals"]) {
    if (!existsSync(join(dir, f))) fail(`agent folder is missing ${f} (${join(dir, f)})`);
  }

  const configMod = (await import(pathToFileURL(resolve(dir, "config.ts")).href)) as {
    config?: AgentConfig;
  };
  if (!configMod.config) fail("config.ts must export `config`");

  const schemaMod = (await import(pathToFileURL(resolve(dir, "schema.ts")).href)) as {
    Output?: ZodType<unknown>;
  };
  if (!schemaMod.Output) fail("schema.ts must export `Output`");

  const prompt = readFileSync(join(dir, "prompt.md"), "utf8");

  const evalsDir = join(dir, "evals");
  const jsonlFiles = readdirSync(evalsDir).filter((f) => f.endsWith(".jsonl"));
  const cases: EvalCase[] = jsonlFiles.flatMap((f) =>
    parseEvalJsonl(readFileSync(join(evalsDir, f), "utf8")),
  );
  if (cases.length === 0) fail(`no eval cases found in ${evalsDir}`);

  let previousAccuracy: number | undefined;
  const lastPath = join(evalsDir, LAST_RESULT);
  if (existsSync(lastPath)) {
    try {
      previousAccuracy = (JSON.parse(readFileSync(lastPath, "utf8")) as { accuracy?: number })
        .accuracy;
    } catch {
      // ignore an unreadable previous result
    }
  }

  return { config: configMod.config, prompt, outputSchema: schemaMod.Output, cases, previousAccuracy };
}

function printReport(report: EvalReport, targetMs: number): void {
  console.info(`\n[eval] ${report.agent}`);
  console.info(
    `  cases: ${report.passed}/${report.total} passed  (accuracy ${(report.accuracy * 100).toFixed(1)}%` +
      (report.previousAccuracy !== undefined
        ? `, prev ${(report.previousAccuracy * 100).toFixed(1)}%`
        : "") +
      `)`,
  );
  console.info(
    `  latency: p50 ${report.p50LatencyMs}ms, p95 ${report.p95LatencyMs}ms (target p95 < ${targetMs}ms)`,
  );
  console.info(`  tokens: avg ${report.avgTokensIn} in / ${report.avgTokensOut} out`);

  const failures = report.cases.filter((c) => !c.pass);
  if (failures.length > 0) {
    console.info(`\n  failing cases:`);
    for (const c of failures) {
      console.info(`   - ${c.id} [${c.outcome}]${c.note ? ` (${c.note})` : ""}`);
      for (const r of c.reasons) console.info(`       ${r}`);
    }
  }

  const p95Breach = report.p95LatencyMs > targetMs;
  const verdict =
    report.regression || p95Breach
      ? "REGRESSION"
      : report.passed === report.total
        ? "PASS"
        : "FAIL";
  console.info(`\n  verdict: ${verdict}\n`);
}

async function main(): Promise<void> {
  const agent = process.argv[2];
  if (!agent) fail("usage: pnpm eval <agent>");

  const dir = join("services", "agents", agent);
  if (!existsSync(dir)) {
    fail(`no agent folder at ${dir}. Create it with the agent-builder subagent.`);
  }

  const { config, prompt, outputSchema, cases, previousAccuracy } = await loadAgent(dir);

  const client = createAnthropicModelClient();
  const report = await runEvalSet({
    config,
    systemPrompt: prompt,
    outputSchema,
    cases,
    client,
    previousAccuracy,
  });

  printReport(report, config.latencyTargetMs);

  writeFileSync(
    join(dir, "evals", LAST_RESULT),
    JSON.stringify(
      {
        agent: report.agent,
        accuracy: report.accuracy,
        passed: report.passed,
        total: report.total,
        p50LatencyMs: report.p50LatencyMs,
        p95LatencyMs: report.p95LatencyMs,
        avgTokensIn: report.avgTokensIn,
        avgTokensOut: report.avgTokensOut,
        at: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );

  if (report.regression || report.p95LatencyMs > config.latencyTargetMs) {
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});
