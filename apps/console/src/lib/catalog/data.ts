import "server-only";
import raw from "./ac_catalogue.json";
import type { Catalogue, CatalogListing, CatalogSupplier } from "./types";

// Cast via unknown: the JSON is data, we don't want tsc inferring/checking a 1.6k-object literal type.
const data = raw as unknown as Catalogue;

const suppliersById = new Map<string, CatalogSupplier>(data.suppliers.map((s) => [s.id, s]));
const listingsById = new Map<string, CatalogListing>();

// Enrich each listing with its supplier's display name once, so search can match on it,
// and index by id (last wins) as a belt-and-braces guard against any duplicate id.
for (const l of data.listings) {
  if (!l.supplierName && l.supplier_id) l.supplierName = suppliersById.get(l.supplier_id)?.name;
  listingsById.set(l.id, l);
}

export function getCatalogue(): Catalogue {
  return data;
}

export function listListings(): CatalogListing[] {
  return data.listings;
}

export function listSuppliers(): CatalogSupplier[] {
  return [...data.suppliers].sort((a, b) => a.name.localeCompare(b.name));
}

export function getSupplier(id: string | null | undefined): CatalogSupplier | undefined {
  return id ? suppliersById.get(id) : undefined;
}

export function getListing(id: string): CatalogListing | undefined {
  return listingsById.get(id);
}
