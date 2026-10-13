-- 20261013090002_phase05_tables.sql
-- Phase 0.5: the data-model tables the later phases need. Forward-only.
-- Conventions (schema-migrator): every table has id/created_at/updated_at; org-owned tables have
-- org_id + per-org RLS (users see their org, ops_admin sees all via public.can_access_org); global
-- reference tables have no org_id, are readable by any authed user and writable by ops_admin only.
-- Constrained status/kind fields use text + CHECK to match the existing operational tables' style.
-- Columns are inferred from the request pending the full spec data model; refine when it lands.

-- ---------------------------------------------------------------------------
-- Global reference tables (no org_id)
-- ---------------------------------------------------------------------------

-- VIN/chassis decode reference: WMI + VDS pattern -> make/model/year window.
create table public.chassis_codes (
  id uuid primary key default gen_random_uuid(),
  wmi text not null,
  vds_pattern text,
  make text not null,
  model text,
  year_from integer,
  year_to integer,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chassis_codes_wmi_idx on public.chassis_codes (wmi);

-- HS tariff reference. The APPLIED duty/VAT used in costing still comes from rates_rules (rule 5);
-- this is a lookup of codes with an indicative rate, source and effective date for provenance.
create table public.hs_tariffs (
  id uuid primary key default gen_random_uuid(),
  hs_code text not null,
  description text,
  country public.country not null,
  duty_rate numeric(5,4),
  vat_applicable boolean not null default true,
  source text not null,
  effective_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index hs_tariffs_code_country_date_idx on public.hs_tariffs (hs_code, country, effective_date);

-- ---------------------------------------------------------------------------
-- Org-owned tables
-- ---------------------------------------------------------------------------

-- KYC / compliance for an importer org or one of its buyers.
create table public.compliance_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  subject_type text not null check (subject_type in ('importer', 'buyer')),
  buyer_id uuid references public.buyers (id) on delete set null,
  legal_name text not null,
  registration_no text,
  tax_no text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index compliance_profiles_org_idx on public.compliance_profiles (org_id);
create index compliance_profiles_buyer_idx on public.compliance_profiles (buyer_id);

-- A verification performed on a supplier (business licence, site visit, reference, sample order).
create table public.supplier_verifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  method text not null check (method in ('business_license', 'site_visit', 'reference', 'sample')),
  status text not null default 'pending' check (status in ('pending', 'passed', 'failed')),
  evidence_url text,
  verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index supplier_verifications_org_idx on public.supplier_verifications (org_id);
create index supplier_verifications_supplier_idx on public.supplier_verifications (supplier_id);

-- Append-only ledger of supplier trust-score changes (the live score stays on suppliers.trust_score).
create table public.trust_score_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  delta numeric(5,3) not null,
  new_score numeric(4,3) not null,
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trust_score_history_supplier_idx on public.trust_score_history (supplier_id, created_at desc);
create index trust_score_history_org_idx on public.trust_score_history (org_id);

-- QC / pre-shipment / arrival inspections for an order.
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('pre_shipment', 'qc', 'arrival')),
  result text check (result in ('pass', 'fail', 'conditional')),
  inspector text,
  photos jsonb not null default '[]'::jsonb,
  notes text,
  inspected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inspections_order_idx on public.inspections (order_id);
create index inspections_org_idx on public.inspections (org_id);

-- Which orders are consolidated onto which sailing (join; org-owned because orders are).
create table public.sailing_participants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  sailing_id uuid not null references public.sailings (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  container_no text,
  booked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index sailing_participants_sailing_order_idx on public.sailing_participants (sailing_id, order_id);
create index sailing_participants_order_idx on public.sailing_participants (order_id);
create index sailing_participants_org_idx on public.sailing_participants (org_id);

-- Which suppliers an RFQ was sent to, and their response state.
create table public.rfq_recipients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  rfq_id uuid not null references public.rfqs (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  status text not null default 'sent' check (status in ('sent', 'viewed', 'quoted', 'declined')),
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index rfq_recipients_rfq_supplier_idx on public.rfq_recipients (rfq_id, supplier_id);
create index rfq_recipients_supplier_idx on public.rfq_recipients (supplier_id);
create index rfq_recipients_org_idx on public.rfq_recipients (org_id);

-- Line-level breakdown of a supplier quote.
create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  order_line_id uuid references public.order_lines (id) on delete set null,
  part_number text,
  description text,
  unit_price_minor bigint,
  currency text,
  moq integer,
  lead_time_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quote_lines_quote_idx on public.quote_lines (quote_id);
create index quote_lines_order_line_idx on public.quote_lines (order_line_id);
create index quote_lines_org_idx on public.quote_lines (org_id);

-- Buyer payments against an order (deposit / balance / refund). Amounts in integer minor units.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('deposit', 'balance', 'refund')),
  amount_minor bigint not null,
  currency text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  method text,
  reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create index payments_org_idx on public.payments (org_id);

-- Signed, expiring, single-use magic-link tokens scoped to one order + one page type.
-- Only the token HASH is stored (never the raw token). See packages/shared/src/magicLink.ts.
create table public.magic_link_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  page_type text not null check (page_type in ('buyer_quote', 'tracking', 'supplier_quote', 'clearing_pack')),
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index magic_link_tokens_hash_idx on public.magic_link_tokens (token_hash);
create index magic_link_tokens_order_idx on public.magic_link_tokens (order_id);
create index magic_link_tokens_org_idx on public.magic_link_tokens (org_id);
create index magic_link_tokens_created_by_idx on public.magic_link_tokens (created_by);

-- Buyer consents (WhatsApp messaging, marketing, data processing) with grant/revoke timestamps.
create table public.buyer_consents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  kind text not null check (kind in ('whatsapp', 'marketing', 'data_processing')),
  granted boolean not null default false,
  granted_at timestamptz,
  revoked_at timestamptz,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index buyer_consents_buyer_kind_idx on public.buyer_consents (buyer_id, kind);
create index buyer_consents_org_idx on public.buyer_consents (org_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse the public.set_updated_at() from migration …0001)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'chassis_codes','hs_tariffs','compliance_profiles','supplier_verifications',
    'trust_score_history','inspections','sailing_participants','rfq_recipients',
    'quote_lines','payments','magic_link_tokens','buyer_consents'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- Global reference tables: authed read, ops_admin write (same pattern as …0006 reference tables).
do $$
declare
  t text;
begin
  foreach t in array array['chassis_codes','hs_tariffs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I_select on public.%I for select using (auth.uid() is not null)', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (public.is_ops_admin())', t, t);
    execute format('create policy %I_update on public.%I for update using (public.is_ops_admin()) with check (public.is_ops_admin())', t, t);
    execute format('create policy %I_delete on public.%I for delete using (public.is_ops_admin())', t, t);
  end loop;
end $$;

-- Org-owned tables: users see/act within their org; ops_admin sees all; deletes are ops_admin only.
do $$
declare
  t text;
begin
  foreach t in array array[
    'compliance_profiles','supplier_verifications','trust_score_history','inspections',
    'sailing_participants','rfq_recipients','quote_lines','payments','magic_link_tokens','buyer_consents'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I_select on public.%I for select using (public.can_access_org(org_id))', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (public.can_access_org(org_id))', t, t);
    execute format('create policy %I_update on public.%I for update using (public.can_access_org(org_id)) with check (public.can_access_org(org_id))', t, t);
    execute format('create policy %I_delete on public.%I for delete using (public.is_ops_admin())', t, t);
  end loop;
end $$;
