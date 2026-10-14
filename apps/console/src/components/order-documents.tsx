import Link from "next/link";
import { Download, Upload, ArrowRight } from "lucide-react";
import type { OrderStatus } from "@easy-logi/shared";
import { statusContent } from "@/lib/documents/content";
import { statusDocs } from "@/lib/documents/requirements";
import { DOC_TITLES, DOC_FOR } from "@/lib/documents/templates";

export function StatusSummaryCard({ status }: { status: OrderStatus }) {
  const c = statusContent(status);
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Where this order is</p>
      <p className="mt-1 text-lg font-semibold">{c.summary}</p>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span><span className="font-medium text-foreground">Next:</span> {c.next} · {c.who}</span>
      </p>
    </div>
  );
}

export function DocumentsPanel({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const docs = statusDocs(status);
  const hasAny = docs.downloads.length > 0 || docs.uploads.length > 0;

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-5 py-3">
        <h2 className="font-semibold">Documents for this step</h2>
      </div>
      <div className="space-y-5 p-5">
        {!hasAny && <p className="text-sm text-muted-foreground">No documents needed at this step.</p>}

        {docs.downloads.length > 0 && (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Download</p>
            <ul className="list-none space-y-1.5 p-0">
              {docs.downloads.map((d) => (
                <li key={d}>
                  <Link
                    href={`/orders/${orderId}/doc/${d}`}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm hover:border-ink"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Download className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {DOC_TITLES[d]}
                    </span>
                    <span className="text-xs text-muted-foreground">{DOC_FOR[d]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {docs.uploads.length > 0 && (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Upload for cross-check</p>
            <ul className="list-none space-y-1.5 p-0">
              {docs.uploads.map((u) => (
                <li key={u} className="flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {u}
                  </span>
                  <span className="text-xs">Upload + auto cross-check coming soon</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
