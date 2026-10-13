import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { listAllAgentRuns, listAllEvents } from "@/lib/mock/backend";
import { summarizeAgentRuns, needsHumanRuns, needsHumanEvents } from "@/lib/ops/health";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function outcomeVariant(o: string): "default" | "secondary" | "success" | "warning" | "destructive" {
  if (o === "ok") return "success";
  if (o === "error" || o === "invalid") return "destructive";
  if (o === "low_confidence" || o === "budget_breach") return "warning";
  return "secondary";
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function OpsPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "ops_admin") {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Ops Health</h1>
        <p className="text-sm text-muted-foreground">Ops Health is available to ops admins only.</p>
      </div>
    );
  }

  const runs = listAllAgentRuns();
  const events = listAllEvents();
  const summary = summarizeAgentRuns(runs);
  const queueRuns = needsHumanRuns(runs);
  const queueEvents = needsHumanEvents(events);
  const okRate = summary.total > 0 ? Math.round((summary.ok / summary.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ops Health</h1>
        <p className="text-sm text-muted-foreground">
          Agent-run health and the derived human-review queue (non-ok runs + un-processed
          needs-human events).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Agent runs" value={String(summary.total)} />
        <Stat label="OK rate" value={`${okRate}%`} hint={`${summary.ok} ok`} />
        <Stat
          label="Needs human"
          value={String(summary.needsHuman + queueEvents.length)}
          hint={`${plural(queueRuns.length, "run")} · ${plural(queueEvents.length, "event")}`}
        />
        <Stat label="Latency p95" value={`${summary.p95LatencyMs}ms`} hint={`p50 ${summary.p50LatencyMs}ms`} />
        <Stat label="Tokens" value={`${summary.tokensIn}→${summary.tokensOut}`} hint="in → out" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Needs human</CardTitle>
          <CardDescription>Runs that did not succeed, and events awaiting a human.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {queueRuns.length === 0 && queueEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting — all clear.</p>
          ) : (
            <>
              {queueRuns.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 border-b py-1 text-sm last:border-b-0">
                  <span className="font-medium">{r.agent}</span>
                  <Badge variant={outcomeVariant(r.outcome)}>{r.outcome}</Badge>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{r.error ?? "—"}</span>
                  {r.order_id ? (
                    <Link href={`/orders/${r.order_id}`} className="text-xs hover:underline">
                      order
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              ))}
              {queueEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 border-b py-1 text-sm last:border-b-0">
                  <span className="font-medium">{e.name}</span>
                  <Badge variant="warning">event</Badge>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {typeof e.payload.reason === "string" ? e.payload.reason : "—"}
                  </span>
                  {e.order_id ? (
                    <Link href={`/orders/${e.order_id}`} className="text-xs hover:underline">
                      order
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent agent runs</CardTitle>
          <CardDescription>Every model call the pipeline logged, newest first.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No agent runs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.slice(0, 20).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.agent}</TableCell>
                    <TableCell>
                      <Badge variant={outcomeVariant(r.outcome)}>{r.outcome}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.latency_ms}ms</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.tokens_in}→{r.tokens_out}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
