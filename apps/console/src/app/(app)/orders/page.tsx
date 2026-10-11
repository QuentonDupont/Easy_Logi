import Link from "next/link";
import type { OrderStatus } from "@easy-logi/shared";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveOrgId } from "@/lib/org-actions";
import { statusLabel, statusBadgeVariant } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateOrderForm } from "@/components/create-order-form";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, reference, status, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  // Ops admins can scope to a selected org; others are scoped by RLS to their own org.
  if (profile?.role === "ops_admin") {
    const activeOrgId = await getActiveOrgId();
    if (activeOrgId) query = query.eq("org_id", activeOrgId);
  }

  const { data: orders, error } = await query;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Every order moves through its lifecycle via the status machine.
          </p>
        </div>
        <CreateOrderForm />
      </div>

      <Card>
        <CardContent className="p-0">
          {error ? (
            <p className="p-6 text-sm text-destructive">
              Could not load orders: {error.message}
            </p>
          ) : !orders || orders.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No orders yet. Create your first one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <Link href={`/orders/${o.id}`} className="hover:underline">
                        {o.reference}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(o.status as OrderStatus)}>
                        {statusLabel(o.status as OrderStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-muted-foreground">
                      {o.summary ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
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
