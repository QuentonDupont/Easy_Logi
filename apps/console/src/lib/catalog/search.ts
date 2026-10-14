import type { CatalogListing, CatalogCategory, CatalogCountry } from "./types";

export type CatalogFilters = {
  q?: string;
  category?: CatalogCategory | "all";
  segment?: string | "all";
  country?: CatalogCountry | "all";
  supplierId?: string | "all";
};

/** Lowercased haystack for free-text search, incl. part number and OEM cross-refs. */
function haystack(l: CatalogListing): string {
  return [
    l.title,
    l.brand,
    l.supplierName,
    l.spec_summary,
    l.application,
    l.compressor_model,
    l.part_number,
    (l.oem_crossrefs ?? []).join(" "),
    l.segments.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Normalise a query token: lowercase, strip spaces and hyphens so "88320-36520" matches "8832036520". */
function normNum(s: string): string {
  return s.toLowerCase().replace(/[\s-]/g, "");
}

export function matchesQuery(l: CatalogListing, q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  const hay = haystack(l);
  // Every whitespace-separated term must match somewhere (AND), as a substring or
  // as a normalised part/OEM number (hyphen/space-insensitive).
  const hayNum = normNum(hay);
  const terms = query.split(/\s+/).filter(Boolean);
  return terms.every((term) => {
    if (hay.includes(term)) return true;
    const nt = normNum(term);
    return nt !== "" && hayNum.includes(nt); // guard: empty-normalised term must not match everything
  });
}

export function filterListings(listings: CatalogListing[], filters: CatalogFilters): CatalogListing[] {
  const { q = "", category = "all", segment = "all", country = "all", supplierId = "all" } = filters;
  return listings.filter((l) => {
    if (category !== "all" && l.category !== category) return false;
    if (country !== "all" && l.country !== country) return false;
    if (segment !== "all" && !l.segments.includes(segment)) return false;
    if (supplierId !== "all" && l.supplier_id !== supplierId) return false;
    if (!matchesQuery(l, q)) return false;
    return true;
  });
}

export type CatalogFacets = {
  total: number;
  units: number;
  compressors: number;
  byCountry: Record<CatalogCountry, number>;
  bySegment: Record<string, number>;
};

export function facetCounts(listings: CatalogListing[]): CatalogFacets {
  const f: CatalogFacets = {
    total: listings.length,
    units: 0,
    compressors: 0,
    byCountry: { CN: 0, IN: 0 },
    bySegment: {},
  };
  for (const l of listings) {
    if (l.category === "unit") f.units++;
    else f.compressors++;
    f.byCountry[l.country] = (f.byCountry[l.country] ?? 0) + 1;
    for (const s of l.segments) f.bySegment[s] = (f.bySegment[s] ?? 0) + 1;
  }
  return f;
}

/** Format a listing's indicative price band, or "On RFQ" when none is published. */
export function priceLabel(l: CatalogListing): string {
  if (l.price_is_placeholder || l.price_low == null) return "On RFQ";
  // Explicit locale so server-rendered prices don't follow the server's ICU default
  // (a non-en server would render "US$1.000" and read as a decimal).
  const fmt = (n: number) => `${l.currency === "USD" ? "US$" : l.currency + " "}${n.toLocaleString("en-US")}`;
  return l.price_high && l.price_high !== l.price_low
    ? `${fmt(l.price_low)}–${fmt(l.price_high)}`
    : fmt(l.price_low);
}

export type Paged<T> = { items: T[]; page: number; pageCount: number; total: number };

export function paginate<T>(items: T[], page: number, pageSize: number): Paged<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), pageCount);
  return { items: items.slice((p - 1) * pageSize, p * pageSize), page: p, pageCount, total };
}
