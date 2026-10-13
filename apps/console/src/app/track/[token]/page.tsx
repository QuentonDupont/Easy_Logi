import type { OrderStatus } from "@easy-logi/shared";
import { verifyMagicLink } from "@/lib/magic-link";
import { getOrderById } from "@/lib/mock/backend";
import { PublicHeader } from "@/components/public-header";
import { StatusJourney } from "@/components/status-journey";
import { statusLabel, statusBadgeVariant } from "@/lib/status";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-5 py-10">{children}</main>
    </div>
  );
}

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = verifyMagicLink(token, { pageType: "tracking" });

  if (!res.ok) {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold tracking-tight">This link isn&apos;t valid</h1>
        <p className="mt-2 text-muted-foreground">
          The tracking link has expired or isn&apos;t recognised. Ask us for a fresh link to follow
          your order.
        </p>
      </Shell>
    );
  }

  const order = getOrderById(res.orderId);
  if (!order) {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold tracking-tight">Order not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn&apos;t find the order for this link.</p>
      </Shell>
    );
  }

  const status = order.status as OrderStatus;
  return (
    <Shell>
      <p className="text-sm text-muted-foreground">Your order</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">{order.reference}</h1>
        <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>
      </div>
      {order.summary && <p className="mt-2 text-muted-foreground">{order.summary}</p>}

      <div className="mt-6">
        <StatusJourney status={status} />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Updated {new Date(order.updated_at).toLocaleString()}. Keep this link to check back any time.
      </p>
    </Shell>
  );
}
