-- 20261011090008_order_status_guard.sql
-- DB-layer hardening of CLAUDE.md rule 3: orders.status changes only through one audited path.
--
-- The TypeScript status machine (packages/shared/src/statusMachine.ts) remains the sole DECIDER
-- of whether a transition is legal. This migration does NOT encode the transition table. It only
-- funnels every status change through public.change_order_status(), which also writes the
-- order_status_changes audit row, and blocks any other UPDATE that touches orders.status.
--
-- Mechanism: a transaction-local GUC `easy_logi.allow_status_change`. change_order_status() sets
-- it to 'on' just around its UPDATE; a BEFORE UPDATE trigger rejects any status change made
-- while the GUC is not 'on'.

-- ---------------------------------------------------------------------------
-- Trigger function: reject status changes made outside change_order_status().
-- ---------------------------------------------------------------------------
create or replace function public.enforce_status_change_guard()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('easy_logi.allow_status_change', true), 'off') <> 'on' then
    raise exception 'orders.status may only change via change_order_status()'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.enforce_status_change_guard() is
  'Trigger function: raises check_violation when orders.status changes unless the transaction-local GUC easy_logi.allow_status_change is on (set only by change_order_status()).';

-- Replay-safe: drop then create. The WHEN clause means non-status updates (summary, buyer_id,
-- updated_at, ...) never invoke the guard.
drop trigger if exists orders_status_guard on public.orders;
create trigger orders_status_guard
  before update on public.orders
  for each row
  when (new.status is distinct from old.status)
  execute function public.enforce_status_change_guard();

comment on trigger orders_status_guard on public.orders is
  'Blocks any change to orders.status that does not go through public.change_order_status().';

-- ---------------------------------------------------------------------------
-- The single audited path for changing an order's status.
-- SECURITY INVOKER (default, stated explicitly): the caller's RLS applies, so a user can only
-- read/update orders and insert audit rows for orgs they can access. The caller (the app, after
-- consulting statusMachine.ts) decides legality; this function does not re-check it.
-- ---------------------------------------------------------------------------
create or replace function public.change_order_status(
  p_order_id uuid,
  p_to public.order_status,
  p_role public.user_role,
  p_note text
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

  -- Open the gate (is_local = true: reverts at end of transaction or on rollback).
  perform set_config('easy_logi.allow_status_change', 'on', true);

  update public.orders
  set status = p_to
  where id = p_order_id;

  insert into public.order_status_changes
    (org_id, order_id, from_status, to_status, role, actor_user_id, note)
  values
    (v_org, p_order_id, v_from, p_to, p_role, auth.uid(), p_note);

  -- Close the gate.
  perform set_config('easy_logi.allow_status_change', 'off', true);
end;
$$;

comment on function public.change_order_status(uuid, public.order_status, public.user_role, text) is
  'Only supported way to change orders.status. Updates the order and writes the order_status_changes audit row in one transaction. SECURITY INVOKER so caller RLS applies. Does NOT validate the transition; statusMachine.ts decides legality before calling.';

-- Grants: functions default to EXECUTE for PUBLIC, so revoke from PUBLIC as well as anon.
revoke execute on function public.change_order_status(uuid, public.order_status, public.user_role, text) from public;
revoke execute on function public.change_order_status(uuid, public.order_status, public.user_role, text) from anon;
grant execute on function public.change_order_status(uuid, public.order_status, public.user_role, text) to authenticated, service_role;
