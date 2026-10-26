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
import { StatusControl, type MoveOption } from "@/components/status-control";
import { StatusJourney } from "@/components/status-journey";
import { ShareLinks } from "@/components/share-links";
import { StatusSummaryCard, DocumentsPanel } from "@/components/order-documents";
import { statusContent } from "@/lib/documents/content";
import { statusDocs } from "@/lib/documents/requirements";
import { DOC_TITLES } from "@/lib/documents/templates";
import { isForwardMove, requiredForMove, resumeFromHistory } from "@/lib/documents/gate";
import { accountInfo, documentsForOrder } from "@/lib/documents/store";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, org_id, reference, status, summary, created_at, updated_at")
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
  const isOps = profile?.role === "ops_admin";

  // Documents are judged by the ORDER's account (business vs individual), not the viewer's.
  const account = accountInfo(order.org_id as string);
  const docs = documentsForOrder(order.org_id as string, order.id);
  const uploaded = new Set(docs.map((d) => d.doc_key));

  // For a paused (on hold / disputed) order, moves are judged from the status it was paused at.
  const resumeFrom = resumeFromHistory((history ?? []) as Array<{ from_status: string; to_status: string }>);

  const moveOptions: MoveOption[] = nextStatusOptions(current, role).map((to) => {
    const next = statusDocs(to, account.accountType);
    return {
      to,
      label: statusLabel(to),
      gated: isForwardMove(current, to, resumeFrom),
      checklist: requiredForMove(current, to, account.accountType, resumeFrom).map((u) => ({
        key: u.key,
        label: u.label,
        present: uploaded.has(u.key),
        uploader: u.uploader,
      })),
      nextSummary: statusContent(to).summary,
      nextNeeds: next.uploads.filter((u) => u.required).map((u) => u.label),
      nextDownloads: next.downloads.map((d) => DOC_TITLES[d]),
    };
  });

  return (
    <div className="space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Orders
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{order.reference}</h1>
        <Badge variant={statusBadgeVariant(current)}>{statusLabel(current)}</Badge>
        {isOps && (
          <span className="rounded-full bg-border-soft px-2.5 py-0.5 text-xs font-medium">
            {account.name} · {account.accountType === "individual" ? "Personal" : "Business"}
          </span>
        )}
      </div>
      {order.summary && <p className="text-muted-foreground">{order.summary}</p>}

      <StatusJourney status={current} />

      <StatusSummaryCard status={current} />

      <DocumentsPanel
        orderId={order.id}
        status={current}
        accountType={account.accountType}
        docs={docs}
        isOps={isOps}
      />

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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change status</CardTitle>
              <CardDescription>Only valid moves are offered; forward moves need the step&apos;s documents.</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusControl
                orderId={order.id}
                currentLabel={statusLabel(current)}
                options={moveOptions}
                isOps={isOps}
              />
            </CardContent>
          </Card>

          {isOps && (
            <Card>
              <CardHeader>
                <CardTitle>Share</CardTitle>
                <CardDescription>No-login links for the buyer and suppliers.</CardDescription>
              </CardHeader>
              <CardContent>
                <ShareLinks orderId={order.id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
