import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@easy-logi/ui";
import { createClient } from "@/lib/supabase/server";
import { buildDocument, deriveLane, laneHeader, DOC_TITLES, DOC_FOOTER, type OrderForDoc } from "@/lib/documents/templates";
import type { DocType } from "@/lib/documents/requirements";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

// Single source of truth: the renderable types are exactly those with a title.
const DOC_TYPES = Object.keys(DOC_TITLES) as DocType[];

export default async function DocumentPage({ params }: { params: Promise<{ id: string; type: string }> }) {
  const { id, type } = await params;
  if (!DOC_TYPES.includes(type as DocType)) notFound();
  const docType = type as DocType;

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, reference, status, summary, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const o = order as OrderForDoc;
  const lane = deriveLane(o);
  const doc = buildDocument(o, docType);
  const generatedOn = new Date().toLocaleDateString();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Screen-only toolbar */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/orders/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to order
        </Link>
        <PrintButton />
      </div>

      {/* The document */}
      <article className="rounded-lg border bg-white p-8 text-foreground print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b pb-4">
          <Logo size={28} variant="dark" />
          <div className="text-right">
            <h1 className="text-lg font-semibold">{DOC_TITLES[docType]}</h1>
            <p className="font-mono text-xs text-muted-foreground">{o.reference} · draft · {generatedOn}</p>
          </div>
        </header>

        <p className="mt-3 font-mono text-xs text-muted-foreground">{laneHeader(lane)}</p>

        <p className="mt-4 rounded-md border border-[color:var(--el-signal-border)] bg-signal-tint px-3 py-2 text-xs">
          <strong>Draft.</strong> Generated from the current order data — fields shown in [brackets] are completed at quote/order time. Not a final or executed document.
        </p>

        <p className="mt-4 text-sm">{doc.intro}</p>
        <p className="mt-1 text-xs text-muted-foreground">For: {doc.forWhom}</p>

        <div className="mt-6 space-y-5">
          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{s.heading}</h2>
              {s.rows && (
                <dl className="mt-2 divide-y rounded-md border">
                  {s.rows.map((r) => (
                    <div key={r.label} className="flex justify-between gap-4 px-3 py-2 text-sm">
                      <dt className="text-muted-foreground">{r.label}</dt>
                      <dd className="text-right font-medium">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {s.text && <p className="mt-2 text-sm leading-relaxed">{s.text}</p>}
              {s.blanks && (
                <div className="mt-2 space-y-5">
                  {s.blanks.map((b) => (
                    <div key={b}>
                      <div className="h-6 border-b border-dashed" />
                      <p className="mt-1 text-xs text-muted-foreground">{b}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-8 border-t pt-3 text-xs text-muted-foreground">{DOC_FOOTER}</footer>
      </article>
    </div>
  );
}
