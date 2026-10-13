import Link from "next/link";
import { Search, ClipboardList, TriangleAlert } from "lucide-react";
import type { OrderStatus } from "@easy-logi/shared";
import { getCurrentProfile } from "@/lib/auth";
import { listAllOrders, listAllAgentRuns, listAllEvents } from "@/lib/mock/backend";
import { needsHumanRuns, needsHumanEvents } from "@/lib/ops/health";
import { ORDER_PHASES, statusLabel, statusBadgeVariant, isOutOfBand } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Stat({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const body = (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const isOps = profile?.role === "ops_admin";

  const orders = listAllOrders();
  const inProgress = orders.filter((o) => o.status !== "closed" && o.status !== "cancelled").length;
  const delivered = orders.filter((o) =>
    ["delivered", "fit_confirmed", "closed"].includes(o.status),
  ).length;
  const attention = orders.filter((o) => isOutOfBand(o.status as OrderStatus)).length;

  const byPhase = ORDER_PHASES.map((p) => ({
    label: p.label,
    count: orders.filter((o) => p.statuses.includes(o.status as OrderStatus)).length,
  }));
  const maxPhase = Math.max(1, ...byPhase.map((p) => p.count));

  const needsHuman = isOps
    ? needsHumanRuns(listAllAgentRuns()).length + needsHumanEvents(listAllEvents()).length
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {greeting()}, {firstName(profile?.fullName, profile?.email)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn a buyer&apos;s request into the right part, landed and cleared. Start with a part to find.
        </p>
      </div>

      {/* Primary action — the product's front door */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl space-y-1">
            <h2 className="font-display text-xl font-semibold">Find a part</h2>
            <p className="text-sm text-muted-foreground">
              Describe it or read it off a photo. The fitment engine matches the exact part number for
              the buyer&apos;s vehicle — then you confirm and the order begins.
            </p>
          </div>
          <Link href="/fitment" className={cn(buttonVariants({ size: "lg" }), "shrink-0")}>
            <Search className="mr-2 h-4 w-4" />
            Find a part
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders in progress" value={inProgress} href="/orders" />
        <Stat label="Delivered" value={delivered} href="/orders" />
        <Stat label="Needs attention" value={attention} href="/orders" />
        {isOps && <Stat label="Needs a human" value={needsHuman} href="/ops" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where orders are</CardTitle>
            <CardDescription>Across the six lifecycle phases.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byPhase.map((p) => (
              <div key={p.label} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-muted-foreground">{p.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(p.count / maxPhase) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-sm font-medium tabular-nums">{p.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent orders</CardTitle>
              <CardDescription>Newest first.</CardDescription>
            </div>
            <Link href="/orders" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ClipboardList className="mr-2 h-4 w-4" />
              All orders
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {orders.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No orders yet. Find a part above to create your first.
              </p>
            ) : (
              orders.slice(0, 6).map((o) => (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
                >
                  <span className="truncate font-mono text-xs font-medium">{o.reference}</span>
                  <Badge variant={statusBadgeVariant(o.status as OrderStatus)}>
                    {statusLabel(o.status as OrderStatus)}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {isOps && needsHuman > 0 && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <TriangleAlert className="h-5 w-5 text-foreground" />
              <p className="text-sm">
                <strong>{needsHuman}</strong> item{needsHuman === 1 ? "" : "s"} need a human — low-confidence
                runs and events waiting in the queue.
              </p>
            </div>
            <Link href="/ops" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open Ops health
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(fullName: string | null | undefined, email: string | null | undefined): string {
  if (fullName) return fullName.split(" ")[0] ?? fullName;
  if (email) return email.split("@")[0] ?? "there";
  return "there";
}
