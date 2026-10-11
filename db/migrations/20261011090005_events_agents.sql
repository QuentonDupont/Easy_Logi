-- 20261011090005_events_agents.sql
-- The event bus (events table + pgmq queue), the order status audit trail, and agent_runs.

-- Every event an agent or workflow emits is recorded here, and also enqueued on pgmq for
-- the workflow dispatcher to consume. services/workflows decides what runs next.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,            -- see EVENT_NAMES in packages/shared/src/events.ts
  order_id uuid references public.orders (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text,               -- idempotency: duplicate deliveries collapse to one effect
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index events_org_idx on public.events (org_id, created_at desc);
create index events_order_idx on public.events (order_id);
-- Idempotency: at most one event per (org, dedupe_key) when a key is supplied.
create unique index events_dedupe_idx on public.events (org_id, dedupe_key)
  where dedupe_key is not null;

-- Audit trail for every order status change. The TS status machine
-- (packages/shared/src/statusMachine.ts) is the only thing allowed to decide a transition;
-- the app writes the resulting change here alongside updating orders.status.
create table public.order_status_changes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status not null,
  to_status public.order_status not null,
  role public.user_role,
  actor_user_id uuid references public.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index order_status_changes_order_idx on public.order_status_changes (order_id, created_at);

-- Every agent run is logged (CLAUDE.md "Agent rules"): model, tokens, latency, outcome.
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  agent text not null,
  model text not null,
  tokens_in integer,
  tokens_out integer,
  latency_ms integer,
  tool_calls integer not null default 0,
  outcome text not null,         -- 'ok' | 'low_confidence' | 'budget_breach' | 'invalid' | 'error'
  error text,
  created_at timestamptz not null default now()
);
create index agent_runs_agent_idx on public.agent_runs (agent, created_at desc);
create index agent_runs_order_idx on public.agent_runs (order_id);

-- Durable queue consumed by the workflow dispatcher (services/workflows).
select pgmq.create('events');
