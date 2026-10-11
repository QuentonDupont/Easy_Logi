# Database

Supabase Postgres schema for Easy Logi. Only the `schema-migrator` subagent edits this folder.

## Layout

- `migrations/` — forward-only, timestamped SQL migrations. Never edit one after it is applied.
- `seed/` — idempotent seed data (`on conflict do nothing`), run after migrations.

## Migrations (in order)

| File | What it does |
| --- | --- |
| `20261011090001_extensions.sql` | pgcrypto, pgvector, pgmq, pg_cron, `set_updated_at()` |
| `20261011090002_core_orgs_users.sql` | organisations, users, RLS helper functions |
| `20261011090003_reference_tables.sql` | vehicles, vehicle_profiles, parts, part_crossrefs, fitments, rates_rules |
| `20261011090004_operational_tables.sql` | order_status enum, buyers, sailings, suppliers, requests, orders, order_lines, rfqs, quotes, messages, documents, shipments, claims |
| `20261011090005_events_agents.sql` | events + pgmq queue, order_status_changes audit, agent_runs |
| `20261011090006_rls_policies.sql` | Row-level security on every table |
| `20261011090007_pgmq_public_api.sql` | `public.queue_send/read/delete/archive` SECURITY DEFINER pgmq wrappers for `.rpc()`, service_role only |
| `20261011090008_order_status_guard.sql` | `orders.status` guard trigger + `public.change_order_status()` RPC (SECURITY INVOKER) that updates the order and writes the `order_status_changes` audit row |

## Running locally

With the Supabase CLI and Docker:

```bash
supabase start                      # boots local Postgres on :54322
supabase db reset                   # applies migrations/ then seed (if configured)
# or apply manually:
for f in db/migrations/*.sql; do psql "$SUPABASE_DB_URL" -f "$f"; done
for f in db/seed/*.sql;       do psql "$SUPABASE_DB_URL" -f "$f"; done
```

> These migrations have **not** been applied in this environment (no local Postgres here).
> Run them against a Supabase project or local stack, then regenerate types (below).

## Linking a login to the demo org

Supabase Auth owns the password/magic-link. After a user signs up, link them:

```sql
insert into public.users (id, org_id, email, role)
values ('<auth-user-uuid>', '00000000-0000-0000-0000-0000000000a1', '<email>', 'ops_admin')
on conflict (id) do update set role = excluded.role, org_id = excluded.org_id;
```

## Regenerating TypeScript types

After any schema change, regenerate the typed client into `packages/shared`:

```bash
supabase gen types typescript --local > packages/shared/src/database.types.ts
```

(A hand-written minimal `database.types.ts` is checked in so the app typechecks before you
have a live database; replace it with the generated file once the schema is applied.)
