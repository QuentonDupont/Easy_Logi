"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { OrderStatus } from "@easy-logi/shared";
import { StatusPill } from "@easy-logi/ui";
import { orderGroup, ORDER_TABS, type OrderTabId } from "@/lib/orders-filter";
import { cn } from "@/lib/utils";

export type OrderRow = {
  id: string;
  reference: string;
  status: OrderStatus;
  summary: string | null;
  created_at: string;
};

function Kpi({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg bg-card p-5",
        accent ? "border-2 border-primary" : "border border-border",
      )}
    >
      <p className={cn("text-[13px] font-semibold", accent ? "text-primary" : "text-muted-foreground")}>
        {label}
      </p>
      <p className="font-mono text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const [tab, setTab] = useState<OrderTabId>("all");

  const counts = useMemo(() => {
    const open = orders.filter((o) => o.status !== "closed" && o.status !== "cancelled").length;
    const groups = orders.map((o) => orderGroup(o.status));
    return {
      open,
      action: groups.filter((g) => g === "action").length,
      port: groups.filter((g) => g === "port").length,
      delivered: groups.filter((g) => g === "delivered").length,
    };
  }, [orders]);

  const rows = useMemo(
    () => (tab === "all" ? orders : orders.filter((o) => orderGroup(o.status) === tab)),
    [orders, tab],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Open orders" value={counts.open} />
        <Kpi label="Needs action" value={counts.action} accent />
        <Kpi label="At port" value={counts.port} />
        <Kpi label="Delivered" value={counts.delivered} />
      </div>

      <div role="group" aria-label="Filter orders" className="flex flex-wrap gap-2">
        {ORDER_TABS.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setTab(t.id)}
              className={cn(
                "min-h-11 rounded-full px-4 text-sm transition-colors",
                selected
                  ? "border border-ink bg-ink font-semibold text-white"
                  : "border border-border bg-card font-medium text-foreground hover:border-ink",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="border-b border-border px-4 py-3 font-semibold">Ref</th>
              <th scope="col" className="border-b border-border px-4 py-3 font-semibold">Summary</th>
              <th scope="col" className="border-b border-border px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="border-b border-border px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No orders in this view.
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id}>
                  <td className="border-b border-border-soft px-4 py-3.5 font-mono font-medium">
                    <Link href={`/orders/${o.id}`} className="hover:text-primary">
                      {o.reference}
                    </Link>
                  </td>
                  <td className="max-w-sm truncate border-b border-border-soft px-4 py-3.5 text-muted-foreground">
                    {o.summary ?? "—"}
                  </td>
                  <td className="border-b border-border-soft px-4 py-3.5">
                    <StatusPill status={o.status} />
                  </td>
                  <td className="border-b border-border-soft px-4 py-3.5 font-mono text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
