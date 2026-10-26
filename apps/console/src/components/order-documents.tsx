import Link from "next/link";
import { Download, ArrowRight } from "lucide-react";
import type { AccountTypeEnum, OrderStatus } from "@easy-logi/shared";
import { statusContent } from "@/lib/documents/content";
import { statusDocs } from "@/lib/documents/requirements";
import { DOC_TITLES, DOC_FOR } from "@/lib/documents/templates";
import type { StoredDocument } from "@/lib/documents/store";
import { DocumentUploadRow } from "@/components/document-upload";

export function StatusSummaryCard({ status }: { status: OrderStatus }) {
  const c = statusContent(status);
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Where this order is</p>
      <p className="mt-1 text-lg font-semibold">{c.summary}</p>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          <span className="font-medium text-foreground">Next:</span> {c.next} · {c.who}
        </span>
      </p>
    </div>
  );
}

/**
 * The documents for the order's current status: templates to download, and the evidence the
 * order needs before it can move on — tailored to a business or an individual account.
 */
export function DocumentsPanel({
  orderId,
  status,
  accountType,
  docs,
  isOps,
}: {
  orderId: string;
  status: OrderStatus;
  accountType: AccountTypeEnum;
  docs: StoredDocument[];
  isOps: boolean;
}) {
  const { downloads, uploads } = statusDocs(status, accountType);
  const filesFor = (key: string) =>
    docs
      .filter((d) => d.doc_key === key)
      .map((d) => ({ id: d.id, filename: d.filename, created_at: d.created_at, status: d.status }));

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <h2 className="font-semibold">Documents for this step</h2>
        <span className="text-xs text-muted-foreground">
          {accountType === "individual" ? "Personal import" : "Business import"}
        </span>
      </div>
      <div className="space-y-5 p-5">
        {downloads.length === 0 && uploads.length === 0 && (
          <p className="text-sm text-muted-foreground">No documents are needed at this step.</p>
        )}

        {uploads.length > 0 && (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Needed before this order can move on
            </p>
            <ul className="list-none space-y-2 p-0">
              {uploads.map((u) => (
                <DocumentUploadRow
                  key={u.key}
                  orderId={orderId}
                  req={u}
                  files={filesFor(u.key)}
                  canUpload={isOps || u.uploader === "customer"}
                />
              ))}
            </ul>
          </div>
        )}

        {downloads.length > 0 && (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Download from Easy Logi
            </p>
            <ul className="list-none space-y-1.5 p-0">
              {downloads.map((d) => (
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

        {docs.length > 0 && (
          <details className="rounded-md border px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium">All documents on file ({docs.length})</summary>
            <ul className="mt-2 list-none space-y-1 p-0 text-xs">
              {docs.map((d) => (
                <li key={d.id} className="flex flex-wrap gap-2">
                  <a href={`/files/${d.id}`} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                    {d.filename}
                  </a>
                  <span className="text-muted-foreground">
                    {d.label} · {d.order_id ? "this order" : "account"} ·{" "}
                    {new Date(d.created_at).toLocaleDateString("en-ZA")}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
