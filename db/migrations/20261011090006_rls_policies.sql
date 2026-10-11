-- 20261011090006_rls_policies.sql
-- Row-level security. Users see only their organisation's rows; role 'ops_admin' sees all
-- (CLAUDE.md / phase-0-kickoff). Global reference tables are readable by any authenticated
-- user and writable only by ops_admin. The Supabase service_role key bypasses RLS and is used
-- by trusted server code (jobs, agents).

-- ---------------------------------------------------------------------------
-- organisations
-- ---------------------------------------------------------------------------
alter table public.organisations enable row level security;
create policy organisations_select on public.organisations
  for select using (public.can_access_org(id));
create policy organisations_insert on public.organisations
  for insert with check (public.is_ops_admin());
create policy organisations_update on public.organisations
  for update using (public.can_access_org(id)) with check (public.can_access_org(id));
create policy organisations_delete on public.organisations
  for delete using (public.is_ops_admin());

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
create policy users_select on public.users
  for select using (public.can_access_org(org_id));
create policy users_insert on public.users
  for insert with check (public.is_ops_admin());
create policy users_update on public.users
  for update using (id = auth.uid() or public.is_ops_admin())
  with check (id = auth.uid() or public.is_ops_admin());
create policy users_delete on public.users
  for delete using (public.is_ops_admin());

-- ---------------------------------------------------------------------------
-- Global reference tables: read by any authenticated user, write by ops_admin only.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'vehicles', 'vehicle_profiles', 'parts', 'part_crossrefs', 'fitments',
    'rates_rules', 'sailings'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() is not null);',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert with check (public.is_ops_admin());',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update using (public.is_ops_admin()) with check (public.is_ops_admin());',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete using (public.is_ops_admin());',
      t || '_delete', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Org-owned tables: full access within the caller's org (ops_admin across all),
-- deletes restricted to ops_admin.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'buyers', 'suppliers', 'requests', 'orders', 'order_lines', 'rfqs', 'quotes',
    'messages', 'documents', 'shipments', 'claims', 'events', 'order_status_changes'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for select using (public.can_access_org(org_id));',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert with check (public.can_access_org(org_id));',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update using (public.can_access_org(org_id)) with check (public.can_access_org(org_id));',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete using (public.is_ops_admin());',
      t || '_delete', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- agent_runs: readable within the org; writes come from trusted server code
-- (service_role bypasses RLS). ops_admin may also write directly.
-- ---------------------------------------------------------------------------
alter table public.agent_runs enable row level security;
create policy agent_runs_select on public.agent_runs
  for select using (org_id is null or public.can_access_org(org_id));
create policy agent_runs_write on public.agent_runs
  for all using (public.is_ops_admin()) with check (public.is_ops_admin());
