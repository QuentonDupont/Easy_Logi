# Easy Logi — Platform extensions roadmap

Extensions beyond the current build (local mock backend + the Phase 1 fitment engine + the
Phase 0.5 hardening pass), from a product review. Each item is slotted into a build phase, with a
note on what it touches in today's system and what it depends on. The authoritative product spec
lives in [`spec.md`](./spec.md); this file is the forward-looking "what's next" list and the
build decisions sit in [`decisions.md`](./decisions.md).

## The three that decide daily use

A shop reaches for Easy Logi every day — not just for slow imports — only if these land. They are
the headline priorities for the next phase.

1. **Stock on hand.** The biggest lever: it changes the promise from "six-week import" to
   "available today in Manzini." Most requests are urgent ("car's on the hoist"), so the engine has
   to offer local stock *before* an import option.
2. **Human takeover in buyer chats.** Ops must see a buyer's conversation and step in when the bot
   is stuck — otherwise the fallback is an ops person replying from their own phone, outside Easy Logi.
3. **Part grades.** Genuine OEM / OEM-equivalent / quality aftermarket / budget, shown as a clear
   good-better-best choice. Southern African buyers shop hard on price, so the grade must be explicit
   to avoid "you sold me junk" disputes.

---

## Phase A — Commercial (near-term, the daily-use unlocks)

| Extension | What it does | Touches / depends on |
| --- | --- | --- |
| **Stock on hand / local fast lane** ⭐ | Answer "available locally in days" before offering a six-week import — sourced both from importers' own recorded stock and from SA distributors (Motus, Goldwagen, Masterparts). | A `stock` concept (part + qty + location) **and** local distributors in the supplier directory tagged with short lead times; branches the fitment result, the buyer `/request`, and the quote page (local-in-2-days vs import-in-6-weeks). See [Sourcing network & middleman model](#sourcing-network--middleman-model). |
| **Part grades** ⭐ | Label every option genuine OEM / OEM-equiv / aftermarket / budget; quote shows good/better/best. | `grade` column on `parts` + `quote_lines`; surfaced in the quote + buyer UI. Catalogue ingestion already owns `parts`, so mostly a column + display. |
| **Lost-demand tracking** | "Most-requested parts we don't stock" — monthly demand signal for what to import by the container. | Nearly free: we already persist every `requests` row and the low-confidence / declined signals. A query + report screen. Potentially the stickiest feature. |
| **Pricing rules** | Margins by category, buyer tier and urgency so quotes don't rely on remembering the markup. | New `pricing_rules` (in `rates_rules` style, with source + effective date). Applied when a quote is built. |
| **Repeat ordering** | "Same as last time for the Quantum?" — one-tap reorder once vehicle profiles exist. | Needs `vehicle_profiles` per buyer; reuses the order + fitment records. Cheap once profiles land. |
| **Unit economics per order** | AI tokens + WhatsApp message cost + payment fees vs margin, per order. | Small addition to the Ops page using the `agent_runs` token data already logged; add WhatsApp/payment cost capture. Worth early given per-message WhatsApp billing. |

## Phase B — Buyer channel & operations

| Extension | What it does | Touches / depends on |
| --- | --- | --- |
| **WhatsApp buyer channel + human takeover** ⭐ | A buyer inbox (the spec only has a supplier inbox) + ops stepping into a stuck bot conversation. | Depends on the WhatsApp Cloud API channel (`services/channels/whatsapp`). Build the takeover UI around the existing derived needs-human queue on the Ops page. |
| **Container & vessel tracking** | Pull carrier/forwarder ETAs so the `at_port_*` statuses update themselves. | Carrier/tracking API integration feeding `sailings` + the status machine (system-role transitions already allowed on the logistics states). |

## Phase C — Pre-launch gates (before onboarding any outside importer)

Unglamorous but they gate go-live — sequence them alongside the deferred real-backend work.

| Extension | What it does | Touches / depends on |
| --- | --- | --- |
| **Real Supabase backend** | Apply migrations to a real project, regenerate `database.types.ts`, add the RLS-isolation + status-guard integration test. | The one deferred Phase 0.5 item (currently mock-only). Multi-tenant maturity other items depend on. |
| **Manual mode** | Every flow finishable by a human if the AI or WhatsApp is down. | The console already runs keyless (offline model), so mostly ensuring no flow hard-requires an agent, with a clear manual path per step. |
| **Staging, error monitoring, backups** | A staging environment, Sentry (or similar), and database backups. | Infra/CI; required before any external importer. |

## Phase D — Financial & fulfilment

| Extension | What it does | Touches / depends on |
| --- | --- | --- |
| **Trade accounts & credit** | Credit limits, monthly statements, overdue reminders on top of the payments ledger. | Builds on `payments`; new `credit_accounts` + statement generation + reminders. |
| **Accounting sync** | Export invoices/payments to Sage or Xero; compliant VAT tax invoices for SA and Eswatini. | Integration + a VAT-compliant invoice template per country. Uses the (now FOB-based) costing. |
| **Warranty tracking** | Warranty period per part + supplier, so a claim shows whether it's still covered. | `warranty_months` on parts/quotes; links to `claims`. |
| **Last-mile delivery** | Book couriers for SA deliveries; record proof of delivery (photo + receiver name). | Courier API + a POD capture on the order; the proof closes disputes. |

## Phase E — Moat & growth (cross-cutting, later)

| Extension | What it does | Touches / depends on |
| --- | --- | --- |
| **Shared supplier intelligence (with consent)** | Anonymised trust scores + verified fitments pooled across importers, so each new tenant is smarter on day one. | The hard-to-copy network effect. Depends on the multi-tenant RLS maturity from Phase C and an explicit consent model (`buyer_consents` exists; add a tenant-sharing consent). |

---

### Sequencing rationale
- **Phase A** is what converts Easy Logi from a slow-import tool into a daily counter tool — ship the
  three ⭐ items (stock on hand, part grades, and — via Phase B — human takeover) first.
- **Lost-demand tracking** and **unit economics** are cheap given what we already log, so they make
  good early wins alongside the headline features.
- **Phase C** doesn't add customer value but gates letting any outside importer in; do it before a
  real pilot, not after.
- **Phases D and E** are heavier and assume the real backend from Phase C.

---

## Sourcing network & middleman model

Easy Logi's position is **sourcing agent first, merchant later** — be the agent for other buyers,
and a merchant only for your own import business. The platform already does the agent's work
(fitment, RFQs, supplier chasing, QC, customs packs, tracking), so you charge a service fee for work
the software mostly automates, without the warehouse, working capital and per-order liability that
being a merchant for everyone would require.

### The three middleman models

| Model | What you do | Capital & risk | How you earn |
| --- | --- | --- | --- |
| Referral marketplace | Match buyer to supplier; they transact directly | Very low | Lead/listing fee; easily bypassed |
| **Sourcing agent** ✅ | Buy on the buyer's behalf, manage QC, shipping, docs; the buyer owns the goods | Medium — operational risk, not inventory | Service fee (% of goods) + consolidation fees |
| Merchant | You buy, own and resell | High — stock, credit, warranty, wrong-part losses | Full margin |

Recommendation: **sourcing agent** for other buyers; **merchant only for your own imports**.

### Where parts come from in Africa

The research reference list, with the catch that most of these hubs are **importers themselves**
(largely from China, Dubai and the US) — so for a buyer in Mbabane, a part from Lagos or Accra is
usually a Chinese part with an extra cross-border leg and markup.

| Hub | Where | Known for |
| --- | --- | --- |
| Motus Aftermarket Parts (Midas, Alert Engine Parts) | South Africa + neighbours | ~539 Southern African retail outlets/agencies (120 owned, 419 franchised) behind 10 wholesale points |
| Goldwagen | Centurion, SA + neighbours | 100+ franchised outlets, 36,000+ parts for workshops, wholesalers and the public |
| Masterparts | South Africa | Engine, suspension, steering, braking, electronics; supplying since 1975 |
| Ladipo Market | Lagos, Nigeria | Often the biggest vehicle-parts market in Africa; new and foreign-used parts |
| Trade Fair (ASPMDA) | Lagos, Nigeria | Mainly new imported parts (vs Ladipo's used focus) |
| Abossey Okai | Accra, Ghana | Thousands of shops; main wholesale destination for West African mechanics |
| Kirinyaga Road | Nairobi, Kenya | East Africa's dealer street; gateway to East Africa (Japanese used-parts auction) |

This list does **two different jobs**:
- **SA distributors (Motus, Goldwagen, Masterparts) are the fast lane.** When a shop needs a part
  today, source locally in days instead of importing for six weeks — this fills the "stock on hand"
  gap *without holding stock*.
- **West & East African hubs are future markets, not suppliers.** Their traders face the same
  problems Easy Logi solves (fitment errors, chasing Chinese factories), making them the expansion
  path after Southern Africa.

### What makes the middleman role hard

- **Disintermediation** — once a shop has a supplier's WeChat it may skip you. Defence: the things
  they can't get alone (a guaranteed fit, consolidated freight, customs handled, tracking) and
  keeping supplier contact details inside the platform.
- **Holding client money** — collecting deposits and paying factories triggers payment-handling and
  cross-border rules; SA and Eswatini have exchange controls on payments abroad. Use a split/escrow
  payment provider and confirm with the bank before money flows through you.
- **Liability** — terms must state who carries a wrong part. The **fit guarantee covers only parts
  Easy Logi matched and verified** — which rule 1 (no model-invented part numbers) already enforces,
  so the boundary is defensible by design.
- **Local distributor relationships** — Motus/Goldwagen won't plug into an API on day one. Start with
  one or two franchise stores (Mbabane, Nelspruit) on WhatsApp, the same way suppliers are handled.

### Platform changes this implies

| Change | What it adds | Phase |
| --- | --- | --- |
| **Supplier directory with local distributors** | Local distributors alongside Chinese/Thai factories, each tagged with lead time. | A/B (extends `suppliers` + supplier verification) |
| **Local-vs-import sourcing** | Compare "local in 2 days" against "import in 6 weeks" for the same part. | A (the local fast-lane feature above) |
| **Service-fee line + agent terms** | A service-fee line and agent terms on every non-own order. | A (extends quotes + order; needs the terms copy) |
| **Exchange-control-aware payments** | Split/escrow provider for cross-border buyer deposits → factory payments. | C/D (builds on `payments`) |

The expansion to West/East African markets (buyers, not suppliers) sits in **Phase E** alongside the
cross-tenant moat.
