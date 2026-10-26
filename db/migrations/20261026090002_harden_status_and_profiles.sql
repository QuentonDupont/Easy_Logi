-- 20261026090002_harden_status_and_profiles.sql
-- Closes two privilege gaps found in review of the business / individual split.
--
-- 1. change_order_status() was EXECUTE-able by every authenticated user, took the caller's role
--    as a parameter and (by design) does not re-check the transition. A buyer could call it
--    directly over PostgREST and skip both the status machine and the document gate. It is now
--    callable only by service_role: the console's server action calls it AFTER statusMachine.ts
--    and the document gate have approved the move, passing the acting user explicitly
--    (auth.uid() is null under the service role).
--
-- 2. organisations_update / users_update let a customer edit their own row, which included the
--    columns that decide what they may do: organisations.account_type (business vs individual
--    document rules) and users.role / users.org_id. Those columns are now ops-only. Service-role
--    and direct database sessions (auth.uid() is null) are unaffected.

-- ---------------------------------------------------------------------------
-- 1. Status changes: service_role only, actor passed explicitly.
-- ---------------------------------------------------------------------------
drop function if exists public.change_order_status(uuid, public.order_status, public.user_role, text);

create or replace function public.change_order_status(
  p_order_id uuid,
  p_to public.order_status,
  p_role public.user_role,
  p_note text,
  p_actor uuid default null
)
returns void
language plpgsql
security invoker
as $$
declare
  v_from public.order_status;
  v_org uuid;
begin
  select status, org_id into v_from, v_org
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception 'order % not found or not accessible', p_order_id
      using errcode = 'no_data_found';
  end if;

  perform set_config('easy_logi.allow_status_change', 'on', true);

  update public.orders
  set status = p_to
  where id = p_order_id;

  insert into public.order_status_changes
    (org_id, order_id, from_status, to_status, role, actor_user_id, note)
  values
    (v_org, p_order_id, v_from, p_to, p_role, coalesce(p_actor, auth.uid()), p_note);

  perform set_config('easy_logi.allow_status_change', 'off', true);
end;
$$;

comment on function public.change_order_status(uuid, public.order_status, public.user_role, text, uuid) is
  'Only supported way to change orders.status. service_role only: the console calls it after statusMachine.ts and the document gate approve the move. Writes the order_status_changes audit row (actor = p_actor, else auth.uid()).';

revoke execute on function public.change_order_status(uuid, public.order_status, public.user_role, text, uuid) from public;
revoke execute on function public.change_order_status(uuid, public.order_status, public.user_role, text, uuid) from anon, authenticated;
grant execute on function public.change_order_status(uuid, public.order_status, public.user_role, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Privilege-bearing profile columns are ops-only.
-- ---------------------------------------------------------------------------
create or replace function public.guard_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  -- Service-role / direct DB sessions have no auth.uid(); ops admins may change anything.
  if auth.uid() is null or public.is_ops_admin() then
    return new;
  end if;

  if tg_table_name = 'organisations' and new.account_type is distinct from old.account_type then
    raise exception 'only Easy Logi ops may change an account type'
      using errcode = 'insufficient_privilege';
  end if;

  if tg_table_name = 'users'
     and (new.role is distinct from old.role or new.org_id is distinct from old.org_id) then
    raise exception 'only Easy Logi ops may change a user''s role or organisation'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

comment on function public.guard_privileged_columns() is
  'Trigger function: non-ops users may not change organisations.account_type, users.role or users.org_id.';

drop trigger if exists organisations_privileged_guard on public.organisations;
create trigger organisations_privileged_guard
  before update on public.organisations
  for each row execute function public.guard_privileged_columns();

drop trigger if exists users_privileged_guard on public.users;
create trigger users_privileged_guard
  before update on public.users
  for each row execute function public.guard_privileged_columns();
