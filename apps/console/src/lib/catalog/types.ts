/** A/C catalogue types — the shape of db/seed-derived data in apps/console/src/lib/catalog/ac_catalogue.json. */

export type CatalogCountry = "CN" | "IN";
export type CatalogCategory = "unit" | "compressor";

export type CatalogSupplier = {
  id: string;
  name: string;
  brand?: string | null;
  country: CatalogCountry;
  location?: string;
  business_type?: string;
  segments?: string[];
  main_products?: string;
  website?: string;
  storefront_url?: string;
  price_band?: string;
  verified: boolean;
};

export type CatalogListing = {
  id: string;
  title: string;
  category: CatalogCategory;
  segments: string[];
  country: CatalogCountry;
  supplier_id: string | null;
  brand?: string | null;
  price_low: number | null;
  price_high: number | null;
  currency: string;
  price_is_placeholder?: boolean;
  spec_summary?: string;
  hs_code?: string | null;
  gross_weight_kg?: number | null;
  image_url: string | null;
  source_url: string;
  source_name: string;
  as_of: string;
  verified: boolean;
  moq?: string;
  // compressor-specific
  part_number?: string;
  compressor_model?: string | null;
  application?: string | null;
  model_year?: string | null;
  pulley_clutch?: string | null;
  oem_crossrefs?: string[];
  refrigerant_oil?: string | null;
  // enriched at load (not in the JSON)
  supplierName?: string;
};

export type Catalogue = {
  as_of: string;
  provenance: string;
  note: string;
  suppliers: CatalogSupplier[];
  listings: CatalogListing[];
};
