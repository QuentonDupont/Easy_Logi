-- 20261011090001_extensions.sql
-- Enable the Postgres extensions Easy Logi relies on.
-- Forward-only. Do not edit after applying.

-- UUIDs + crypto helpers (gen_random_uuid lives in pgcrypto on older PG).
create extension if not exists pgcrypto with schema extensions;

-- Vector similarity for candidate retrieval (fitment engine, Phase 1).
create extension if not exists vector with schema extensions;

-- Durable queues for the event bus (agents are triggered by an event row via pgmq).
create extension if not exists pgmq;

-- Scheduled jobs: chasers, daily digests, FX refresh (services/jobs).
create extension if not exists pg_cron;

-- updated_at trigger helper, shared by every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
