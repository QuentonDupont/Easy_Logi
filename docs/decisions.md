# Decisions log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-10-11 | Order status model defined in `packages/shared/statusMachine.ts`: 13 backbone statuses (`requested` → … → `delivered` → `closed`) plus `on_hold`, `disputed`, `cancelled`, with per-transition role gating and `requiresHuman` flags on the money/approval/customs gates. | `docs/spec.md` is still a placeholder. Derived the model from `docs/phase-0-kickoff.md` ("requested → … → fit_confirmed, plus on_hold, disputed, cancelled") and the two-engine flow in `CLAUDE.md`. Revisit when the full spec lands. |
| 2026-10-11 | Money is represented as integer minor units (cents) throughout `packages/costing`; shared costs are split with a largest-remainder allocator. | Avoids floating-point drift and guarantees allocated parts sum exactly to the total. |
| 2026-10-11 | Landed cost: duty on FOB; customs value = FOB + freight + insurance (CIF); VAT = 15% × (1.10 × customs value + duty). All rates are passed in from `rates_rules`, never hard-coded. | Matches the costing note in `CLAUDE.md`/test-writer. Seed rates are placeholders marked `verified = false`. |
| 2026-10-11 | `@supabase/ssr` pinned to `^0.12.7` with `@supabase/supabase-js` `^2.117.3`. | `@supabase/ssr@0.5.2`'s `SupabaseClient` generic order is incompatible with `supabase-js ≥ 2.114`; typed queries resolved to `never`. The 0.12.x line targets `supabase-js ^2.114`. |
| 2026-10-11 | Console authentication uses Supabase magic-link (email OTP). | Simplest robust auth for Phase 0; password / SSO can be added without changing the data model. |
| 2026-10-11 | DB migrations were **not** applied in this environment (no local Postgres/Docker). SQL is written and self-consistent; a minimal hand-written `database.types.ts` is checked in. | Apply via the Supabase CLI, then regenerate `packages/shared/src/database.types.ts` with `supabase gen types`. |
