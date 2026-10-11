# Easy Logi

Easy Logi turns "I need this part" into a landed, cleared, correct auto part in Eswatini or
South Africa. Two engines share one order record: a **fitment engine** (photo / licence disc /
VIN / text → verified part numbers) and a **sourcing + supplier-comms engine** (RFQ → quotes →
PO → QC → customs → delivery).

Project rules live in [`CLAUDE.md`](./CLAUDE.md); the build plan is in
[`docs/`](./docs) (`spec.md`, `agent-roster.md`, `phase-0-kickoff.md`, `decisions.md`).

## Status — Phase 0 (Foundations) ✅

Console login, an order that can be created and walked through every status manually, the
pure-code engines, the schema, and CI. No AI agents yet (they begin in Phase 1).

| Area | Where | Notes |
| --- | --- | --- |
| Monorepo + tooling | root | pnpm workspaces, TS strict, ESLint, Prettier, Vitest |
| Order status machine | `packages/shared/src/statusMachine.ts` | the only place status changes; fully unit-tested |
| Shared types / zod schemas / events | `packages/shared` | domain contracts + event registry |
| Landed-cost engine | `packages/costing` | duty, VAT, FX, consolidation split — pure, 100% tested |
| Database | `db/migrations`, `db/seed` | all Phase 0 tables, org RLS, pgvector, pgmq |
| Event plumbing | `services/workflows` | dispatcher + idempotent event bus (agents plug in here) |
| Console | `apps/console` | Next.js + Supabase Auth, orders list/detail, status control |

## Repo layout

```
apps/console        web console for importers and ops (login)
apps/pages          magic-link pages (buyer quote, tracking, supplier quote, clearing pack) — Phase 1+
packages/shared     types, zod schemas, statusMachine.ts, event registry, db types
packages/costing    landed cost engine — pure functions, 100% unit-tested
services/workflows  event bus + dispatcher that decides what runs next
services/agents     one folder per runtime agent (Phase 1+); _template to scaffold from
services/{api,channels,jobs}  webhooks/edge fns, channel adapters, cron (Phase 1+)
db/migrations       SQL migrations (schema-migrator subagent only)
db/seed             launch vehicles, categories, placeholder rates
```

## Getting started

```bash
pnpm install
cp .env.example .env.local          # fill in Supabase + (later) Anthropic / WhatsApp keys

# quality gates (what CI runs)
pnpm lint
pnpm typecheck
pnpm test

# database (needs the Supabase CLI + Docker)
supabase start
for f in db/migrations/*.sql; do psql "$SUPABASE_DB_URL" -f "$f"; done
for f in db/seed/*.sql;       do psql "$SUPABASE_DB_URL" -f "$f"; done
supabase gen types typescript --local > packages/shared/src/database.types.ts

# run the console
pnpm dev                            # http://localhost:3000
```

See [`db/README.md`](./db/README.md) for linking a login to the demo org.

## Acceptance (Phase 0)

Log in → create an order → move it through all statuses → an illegal transition is rejected.
The status machine enforces the allowed transitions and which role may trigger each; money, PO,
part-number approval and customs gates require a human action.
