-- 20261013090001_order_status_phase05.sql
-- Phase 0.5: extend the order_status enum to the reconciled model (spec Module 3).
-- Forward-only. Postgres cannot reorder or remove enum labels, so the 8 new values are ADDed
-- (positioned near sensible anchors); `fit_confirmed` keeps its physical slot but is now used as
-- the post-delivery buyer confirmation, and `matched` is the new fitment-complete state. The
-- transition rules live in packages/shared/src/statusMachine.ts; this migration only widens the type.
-- ALTER TYPE ... ADD VALUE is allowed inside a transaction on PG 12+ (Supabase).

alter type public.order_status add value if not exists 'matched' after 'fitment_in_progress';
alter type public.order_status add value if not exists 'deposit_paid' after 'po_issued';
alter type public.order_status add value if not exists 'qc_pending' before 'qc_passed';
alter type public.order_status add value if not exists 'balance_paid' after 'qc_passed';
alter type public.order_status add value if not exists 'at_consolidation' before 'in_transit';
alter type public.order_status add value if not exists 'at_port_durban' after 'in_transit';
alter type public.order_status add value if not exists 'at_port_maputo' after 'in_transit';
alter type public.order_status add value if not exists 'in_transit_road' after 'cleared';

-- The order_status_guard trigger + public.change_order_status() RPC reference the enum by name and
-- continue to work unchanged. After applying this against a real project, regenerate the typed
-- client: `supabase gen types typescript --local > packages/shared/src/database.types.ts`.
