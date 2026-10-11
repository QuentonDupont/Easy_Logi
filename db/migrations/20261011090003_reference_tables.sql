-- 20261011090003_reference_tables.sql
-- Global reference data (no org_id): vehicles, parts, cross-refs, fitments, rates_rules.
-- These are readable by every authenticated user; only ops_admin may write.

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model text not null,
  year_range text,            -- e.g. '2005-2015'
  engine text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index vehicles_make_model_year_idx
  on public.vehicles (make, model, coalesce(year_range, ''), coalesce(engine, ''));

-- Variant/trim detail and decode hints for a vehicle (VIN/chassis ranges, etc.).
create table public.vehicle_profiles (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  variant text not null,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicle_profiles_vehicle_idx on public.vehicle_profiles (vehicle_id);

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  part_number text not null,
  brand text not null,
  category text not null,     -- 'AC', 'engine_consumables', 'body', ...
  description text,
  -- pgvector embedding for retrieval (Phase 1). 1536 dims kept nullable until populated.
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index parts_brand_number_idx on public.parts (brand, part_number);
create index parts_category_idx on public.parts (category);

-- Cross-references between equivalent part numbers across brands.
create table public.part_crossrefs (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts (id) on delete cascade,
  crossref_brand text not null,
  crossref_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index part_crossrefs_part_idx on public.part_crossrefs (part_id);
create index part_crossrefs_lookup_idx on public.part_crossrefs (crossref_brand, crossref_number);

-- Which part fits which vehicle, with a position and a source/confidence.
create table public.fitments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  part_id uuid not null references public.parts (id) on delete cascade,
  position text,              -- 'front_left', 'rear', ...
  source text not null,       -- where this fitment came from
  confidence numeric(4, 3),   -- 0..1 when derived
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index fitments_vehicle_part_position_idx
  on public.fitments (vehicle_id, part_id, coalesce(position, ''));

-- Rates, duties, permits, routes, FX. CLAUDE.md rule 5: every rate carries a source and an
-- effective date, and is NEVER hard-coded in application code.
create table public.rates_rules (
  id uuid primary key default gen_random_uuid(),
  kind text not null,         -- 'duty' | 'vat' | 'vat_uplift' | 'fx' | 'permit' | 'route'
  key text not null,          -- e.g. HS code, currency pair 'ZAR_USD', permit name
  value jsonb not null,       -- rate/fraction/amount or structured rule
  source text not null,       -- authority / document reference
  effective_date date not null,
  verified boolean not null default false,  -- placeholders seed as false ('verify')
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rates_rules_kind_key_idx on public.rates_rules (kind, key, effective_date desc);

create trigger vehicles_set_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger vehicle_profiles_set_updated_at before update on public.vehicle_profiles
  for each row execute function public.set_updated_at();
create trigger parts_set_updated_at before update on public.parts
  for each row execute function public.set_updated_at();
create trigger part_crossrefs_set_updated_at before update on public.part_crossrefs
  for each row execute function public.set_updated_at();
create trigger fitments_set_updated_at before update on public.fitments
  for each row execute function public.set_updated_at();
create trigger rates_rules_set_updated_at before update on public.rates_rules
  for each row execute function public.set_updated_at();
