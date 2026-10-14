-- A/C parts digest — supplier directory + product catalogue (groundwork).
--
-- The running feature is seeded from apps/console/src/lib/catalog/ac_catalogue.json (built by
-- scripts/build-ac-catalogue.py from the user's China A/C workbook + a curated India set). This
-- migration is the DB target for when the real backend lands; it is NOT applied in mock mode.
--
-- Rule-data discipline (CLAUDE.md rule 5): every row carries source_name/source_url/as_of and a
-- `verified` flag. Prices are indicative FOB bands, not quotes — all seeded verified = false.
-- Reference-style access: any authenticated user reads; only ops_admin writes.

create table public.catalog_suppliers (
  id text primary key,
  name text not null,
  brand text,
  country text not null check (country in ('CN', 'IN')),
  location text,
  business_type text,
  segments text[] not null default '{}',
  main_products text,
  website text,
  storefront_url text,
  price_band text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_listings (
  id text primary key,
  title text not null,
  category text not null check (category in ('unit', 'compressor')),
  segments text[] not null default '{}',
  country text not null check (country in ('CN', 'IN')),
  supplier_id text references public.catalog_suppliers (id) on delete set null,
  brand text,
  price_low numeric(12, 2),
  price_high numeric(12, 2),
  constraint catalog_listings_price_order check (price_low is null or price_high is null or price_low <= price_high),
  currency text not null default 'USD',
  price_is_placeholder boolean not null default false,
  spec_summary text,
  hs_code text,
  gross_weight_kg numeric(10, 3),
  image_url text,
  -- compressor-specific
  part_number text,
  compressor_model text,
  application text,
  model_year text,
  pulley_clutch text,
  oem_crossrefs text[] not null default '{}',
  refrigerant_oil text,
  moq text,
  -- provenance (rule 5)
  source_name text not null,
  source_url text,
  as_of date,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index catalog_listings_category_idx on public.catalog_listings (category);
create index catalog_listings_country_idx on public.catalog_listings (country);
create index catalog_listings_supplier_idx on public.catalog_listings (supplier_id);
create index catalog_listings_segments_idx on public.catalog_listings using gin (segments);
create index catalog_listings_oem_idx on public.catalog_listings using gin (oem_crossrefs);
-- free-text search over title / part number / application
create index catalog_listings_search_idx on public.catalog_listings
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(part_number, '') || ' ' || coalesce(application, '')));

create trigger set_updated_at before update on public.catalog_suppliers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.catalog_listings
  for each row execute function public.set_updated_at();

alter table public.catalog_suppliers enable row level security;
alter table public.catalog_listings enable row level security;

-- Reference data: authenticated users read; only ops_admin writes.
create policy catalog_suppliers_read on public.catalog_suppliers
  for select to authenticated using (true);
create policy catalog_suppliers_write on public.catalog_suppliers
  for all to authenticated using (public.is_ops_admin()) with check (public.is_ops_admin());

create policy catalog_listings_read on public.catalog_listings
  for select to authenticated using (true);
create policy catalog_listings_write on public.catalog_listings
  for all to authenticated using (public.is_ops_admin()) with check (public.is_ops_admin());
