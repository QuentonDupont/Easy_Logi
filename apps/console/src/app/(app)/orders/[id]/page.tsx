import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { OrderStatus } from "@easy-logi/shared";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, toConsoleRole } from "@/lib/auth";
import { statusLabel, statusBadgeVariant, nextStatusOptions } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusControl } from "@/components/status-control";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, reference, status, summary, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const { data: history } = await supabase
    .from("order_status_changes")
    .select("id, from_status, to_status, role, note, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  const current = order.status as OrderStatus;
  const role = profile ? toConsoleRole(profile.role) : "importer";
  const options = nextStatusOptions(current, role);

  return (
    <div className="space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Orders
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{order.reference}</h1>
        <Badge variant={statusBadgeVariant(current)}>{statusLabel(current)}</Badge>
      </div>
      {order.summary && <p className="text-muted-foreground">{order.summary}</p>}

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Status history</CardTitle>
            <CardDescription>Every transition is recorded here.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!history || history.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                No transitions yet — this order is still <strong>{statusLabel(current)}</strong>.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Change</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        {statusLabel(h.from_status as OrderStatus)} →{" "}
                        <strong>{statusLabel(h.to_status as OrderStatus)}</strong>
                        {h.note && (
                          <span className="block text-xs text-muted-foreground">{h.note}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{h.role ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(h.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change status</CardTitle>
            <CardDescription>Only valid transitions are offered.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusControl orderId={order.id} options={options} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
