import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { listListings, listSuppliers, getSupplier } from "@/lib/catalog/data";
import {
  filterListings,
  facetCounts,
  priceLabel,
  paginate,
  type CatalogFilters,
} from "@/lib/catalog/search";
import type { CatalogCategory, CatalogCountry } from "@/lib/catalog/types";
import { CatalogImage } from "@/components/catalog-image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const SEGMENTS = ["minibus", "bus", "truck", "tractor", "van", "construction"];

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CataloguePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters: CatalogFilters = {
    q: first(sp.q),
    category: (first(sp.category) || "all") as CatalogCategory | "all",
    segment: first(sp.segment) || "all",
    country: (first(sp.country) || "all") as CatalogCountry | "all",
    supplierId: first(sp.supplier) || "all",
  };
  const pageNum = Math.max(1, parseInt(first(sp.page) || "1", 10) || 1);

  const all = listListings();
  const totals = facetCounts(all);
  const filtered = filterListings(all, filters);
  const facets = facetCounts(filtered);
  const paged = paginate(filtered, pageNum, PAGE_SIZE);
  const suppliers = listSuppliers();

  const hrefFor = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string> = {
      q: filters.q ?? "",
      category: filters.category ?? "all",
      segment: filters.segment ?? "all",
      country: filters.country ?? "all",
      supplier: filters.supplierId ?? "all",
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all") p.set(k, v);
    }
    const s = p.toString();
    return `/catalogue${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Parts catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Vehicle A/C units and compressors from vetted China &amp; India suppliers — search by vehicle,
          OEM number or part number.
        </p>
      </div>

      <div className="rounded-lg border border-[color:var(--el-signal-border)] bg-signal-tint px-4 py-3 text-sm text-foreground">
        Indicative FOB price bands and specs from supplier listings — <strong>estimates, not quotes</strong>.
        Every item is unverified; confirm price, fit and shipping by RFQ.
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Listings" value={totals.total} />
        <Kpi label="Complete units" value={totals.units} />
        <Kpi label="Compressors" value={totals.compressors} />
        <Kpi label="Suppliers (CN / IN)" value={`${totals.byCountry.CN + totals.byCountry.IN}`} sub={`${totals.byCountry.CN} CN · ${totals.byCountry.IN} IN`} />
      </div>

      {/* Filter bar */}
      <form method="get" aria-label="Filter catalogue" className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_auto_auto_auto_auto_auto] md:items-end">
        <Field label="Search">
          <input
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Hilux, OEM 88310-02370, TM31…"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
        <Select name="category" label="Type" value={filters.category ?? "all"} options={[["all", "All types"], ["unit", "Complete units"], ["compressor", "Compressors"]]} />
        <Select name="segment" label="Vehicle" value={filters.segment ?? "all"} options={[["all", "All vehicles"], ...SEGMENTS.map((s) => [s, s[0]!.toUpperCase() + s.slice(1)] as [string, string])]} />
        <Select name="country" label="Origin" value={filters.country ?? "all"} options={[["all", "All"], ["CN", "China"], ["IN", "India"]]} />
        <Select
          name="supplier"
          label="Supplier"
          value={filters.supplierId ?? "all"}
          options={[["all", "All suppliers"], ...suppliers.map((s) => [s.id, `${s.name} (${s.country})`] as [string, string])]}
        />
        <button type="submit" className={cn(buttonVariants(), "h-11")}>Filter</button>
      </form>

      {/* Results */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {facets.total.toLocaleString("en-US")} result{facets.total === 1 ? "" : "s"}
          {facets.total > 0 && ` · ${facets.units} units · ${facets.compressors} compressors`}
        </span>
        {paged.pageCount > 1 && <span>Page {paged.page} of {paged.pageCount}</span>}
      </div>

      {paged.items.length === 0 ? (
        <p className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Nothing matches those filters. Try a broader search or clear the filters.
        </p>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paged.items.map((l) => {
            const supplier = getSupplier(l.supplier_id);
            return (
              <li key={l.id} className="flex flex-col overflow-hidden rounded-lg border bg-card">
                <div className="aspect-[4/3] w-full border-b bg-white">
                  <CatalogImage src={l.image_url} alt={l.title} category={l.category} />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    <Chip>{l.category === "unit" ? "Complete unit" : "Compressor"}</Chip>
                    {l.segments.slice(0, 2).map((s) => (
                      <Chip key={s} muted>{s}</Chip>
                    ))}
                    <Chip muted>{l.country === "CN" ? "China" : "India"}</Chip>
                  </div>
                  <h2 className="line-clamp-2 text-sm font-semibold leading-snug">{l.title.replace(/^\[Hot Item\]\s*/i, "")}</h2>
                  {l.part_number && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {l.part_number}
                      {l.oem_crossrefs && l.oem_crossrefs.length > 0 && ` · OEM ${l.oem_crossrefs.slice(0, 2).join(", ")}`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{supplier?.name ?? l.brand ?? "—"}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <span className="font-mono text-sm font-semibold">
                      {priceLabel(l)}
                      {priceLabel(l) !== "On RFQ" && <span className="ml-1 text-xs font-normal text-muted-foreground">indic.</span>}
                    </span>
                    {l.source_url && (
                      <a
                        href={l.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Source <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  <Link href="/request" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1 w-full")}>
                    Request a quote
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {paged.pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          {paged.page > 1 && (
            <Link href={hrefFor({ page: String(paged.page - 1) })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">Page {paged.page} of {paged.pageCount}</span>
          {paged.page < paged.pageCount && (
            <Link href={hrefFor({ page: String(paged.page + 1) })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
      <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString("en-US") : value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: [string, string][];
}) {
  return (
    <Field label={label}>
      <select
        name={name}
        defaultValue={value}
        className="h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </Field>
  );
}

function Chip({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
        muted ? "bg-border-soft text-foreground" : "bg-ink text-white",
      )}
    >
      {children}
    </span>
  );
}
