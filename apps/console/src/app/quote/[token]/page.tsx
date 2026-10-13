import { CheckCircle2 } from "lucide-react";
import { verifyMagicLink, isMagicLinkUsed } from "@/lib/magic-link";
import { getOrderById } from "@/lib/mock/backend";
import { PublicHeader } from "@/components/public-header";
import { SupplierQuoteForm } from "@/components/supplier-quote-form";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-5 py-10">{children}</main>
    </div>
  );
}

export default async function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = verifyMagicLink(token, { pageType: "supplier_quote" });

  if (!res.ok) {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold tracking-tight">This link isn&apos;t valid</h1>
        <p className="mt-2 text-muted-foreground">
          The quote request has expired or isn&apos;t recognised. Ask Easy Logi for a fresh link.
        </p>
      </Shell>
    );
  }

  const order = getOrderById(res.orderId);
  if (!order) {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold tracking-tight">Request not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn&apos;t find the request for this link.</p>
      </Shell>
    );
  }

  if (isMagicLinkUsed(token)) {
    return (
      <Shell>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight">Quote received</h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Thanks — your quote for <span className="font-mono text-sm">{order.reference}</span> is in.
          We&apos;ll be in touch if it&apos;s selected.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-sm text-muted-foreground">Request for quote</p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{order.reference}</h1>
      {order.summary && <p className="mt-2 text-muted-foreground">{order.summary}</p>}

      <div className="mt-8 rounded-lg border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Your quote</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Price per unit, currency, lead time and minimum order. You can submit once.
        </p>
        <div className="mt-4">
          <SupplierQuoteForm token={token} />
        </div>
      </div>
    </Shell>
  );
}
