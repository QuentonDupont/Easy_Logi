# Phase 0 kickoff prompt (paste into Claude Code)

Read CLAUDE.md, docs/spec.md and docs/agent-roster.md. We are starting Phase 0: Foundations.

Goal: console login works, and an order can be created and moved through every status manually.
No AI agents in this phase.

Produce a plan first and wait for my approval. The plan should cover:
1. pnpm monorepo scaffold matching the layout in CLAUDE.md (apps/console, apps/pages, packages/shared,
   packages/costing, services/*, db/*), TypeScript strict, Vitest, ESLint, .env.example.
2. Supabase project setup + first migrations (use the schema-migrator subagent): organisations, users,
   buyers, vehicles, vehicle_profiles, parts, part_crossrefs, fitments, requests, orders, order_lines,
   suppliers, rfqs, quotes, messages, events, documents, shipments, sailings, claims, rates_rules,
   agent_runs. Row-level security per organisation; ops admins see all orgs. Enable pgvector and pgmq.
3. packages/shared/statusMachine.ts implementing the order status model from the spec
   (requested → … → fit_confirmed, plus on_hold, disputed, cancelled) with allowed transitions,
   who may trigger each, and full unit tests.
4. db/seed: the 15–20 launch vehicles (Hilux, Quantum, Corolla, Ranger, Polo, NP200, D-Max and similar),
   part categories (AC, engine consumables, body), and a placeholder rates_rules set marked "verify".
5. apps/console shell: Supabase Auth login, org switcher for ops, an Orders list + order detail page
   with a status-change control that calls the status machine. shadcn/ui only.
6. Event plumbing (no agents yet): an `events` insert helper + a pgmq queue + a workflow dispatcher stub
   in services/workflows, so Phase 1 agents can plug in.
7. CI: typecheck, lint, unit tests on every push.

Acceptance: I can log in, create an order, move it through all statuses, and an illegal transition is rejected.
