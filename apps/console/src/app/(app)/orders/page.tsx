import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveOrgId } from "@/lib/org-actions";
import { OrdersTable, type OrderRow } from "@/components/orders-table";
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

      {error ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-destructive">
          Could not load orders: {error.message}
        </p>
      ) : !orders || orders.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No orders yet. Create your first one above.
        </p>
      ) : (
        <OrdersTable orders={orders as OrderRow[]} />
      )}
    </div>
  );
}
