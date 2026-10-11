-- 20261011090002_core_orgs_users.sql
-- Organisations + users (tenant model) and the RLS helper functions.

create type public.user_role as enum ('ops_admin', 'importer_admin', 'importer_member');
create type public.country as enum ('SZ', 'ZA'); -- Eswatini, South Africa

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country public.country not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Application users map 1:1 to Supabase auth users.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete restrict,
  email text not null,
  full_name text,
  role public.user_role not null default 'importer_member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_org_id_idx on public.users (org_id);

create trigger organisations_set_updated_at
  before update on public.organisations
  for each row execute function public.set_updated_at();
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers. SECURITY DEFINER so they can read public.users without being
-- blocked by (or recursing through) that table's own RLS policies.
-- ---------------------------------------------------------------------------
create or replace function public.auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.users where id = auth.uid();
$$;

create or replace function public.is_ops_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'ops_admin'
  );
$$;

-- An org-owned row is visible when it belongs to the caller's org, or the caller is ops_admin.
create or replace function public.can_access_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_ops_admin() or target_org = public.auth_org_id();
$$;
