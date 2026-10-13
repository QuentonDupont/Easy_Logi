# Easy Logi — Commerce Model (purchase routing, no funds held)

This supersedes any earlier idea of Easy Logi holding buyer or supplier money.

## 1. Core decision

**Easy Logi never holds, receives or forwards money for parts.** Buyers pay sellers directly, on the seller's own payment page or account. Easy Logi's job is to make sure the buyer pays the **right seller**, for the **right part**, at the **agreed price**, through the **safest available payment option**, with an Easy Logi reference attached. The only money Easy Logi collects is its own fee, on its own invoice.

Easy Logi is the trusted link between "this is the correct part" and "this is the correct place to pay for it."

## 2. The value formula

Every quote shows the buyer:

```
Value to buyer = price saved + days saved + risk removed − Easy Logi fee
```

- **Price saved** = local retail price − landed price via the chosen seller (local prices come from SA distributor quotes in the sourcing network).
- **Days saved** = days off the road avoided × buyer's daily cost (fleet/taxi buyers can set this in their profile).
- **Risk removed** = wrong-part risk and supplier risk removed by verified fitment, vetted sellers, verified payment details and the fit guarantee.

Quote page line, for example: "Save R1,240 vs local retail · Fit guaranteed · Pay seller via protected checkout · Arrives in ~6 weeks (or 2 days locally for R380 more)."

If value is not positive, show the local option first. Never hide a cheaper local route.

## 3. How Easy Logi earns (without holding funds)

| Stream | Who pays | How collected | Notes |
| --- | --- | --- | --- |
| Buyer service fee | Buyer | Easy Logi's own invoice / payment link (separate from the part payment) | % of goods value with a minimum per order; includes the fit guarantee |
| Seller referral commission | Supplier / distributor | Monthly commission statement under a referral agreement | Paid on orders carrying an Easy Logi reference, incl. repeat orders from referred buyers for a set period |
| Consolidation coordination fee | Participants | Easy Logi invoice; freight itself is billed by the forwarder directly | Per CBM or per order |
| Importer subscription | Importers using the console | Easy Logi subscription billing | For importers running their own sourcing on Easy Logi |
| Seller verification badge | Suppliers | Easy Logi invoice | Paid audit + "Verified" listing; improves trust data |
| Market reports (later) | Distributors, importers | Subscription | Lost demand, price trends |

All rates are pilot hypotheses stored in `rates_rules` (kind = `fee`), never hard-coded. Disclose to buyers that Easy Logi may receive a referral commission from sellers.

## 4. The Purchase Pack (core object)

When a buyer accepts a quote, the system generates a **Purchase Pack**: everything needed to buy correctly from one seller.

Contents:
- Seller: verified legal name, country, trust score, verification level.
- Line items: part number(s) (from DB only), description, grade (OEM / OEM-equivalent / aftermarket / budget), quantity, unit price, currency, agreed Incoterm.
- Consignee and delivery details exactly as customs needs them (importer name, address, tax/customs codes), so seller paperwork matches the compliance checklist.
- **Easy Logi reference code** (e.g. `EL-7K3Q-0192`) that the buyer must put in the payment reference and that the seller must print on the commercial invoice.
- Payment options, ranked by protection level (section 5), each with a deep link or verified details.
- Payment schedule guidance: e.g. 30% deposit, balance after QC passes.
- Quote validity date and FX note.
- What the fit guarantee covers and what voids it (e.g. paying outside the listed options, changing quantities with the seller directly).

The pack is shown on a magic-link **purchase page** and summarised in WhatsApp. It is versioned: any change to price, quantity or payment details creates a new version and invalidates the old links.

## 5. Payment options (seller-side), ranked by protection

| Rank | Option | Typical use | Protection | How Easy Logi confirms payment |
| --- | --- | --- | --- | --- |
| 1 | Marketplace checkout with buyer protection (e.g. Alibaba.com Trade Assurance where the seller supports it) | China factories/traders | Highest: platform holds funds per its own terms | Order link + buyer screenshot or seller confirmation |
| 2 | Seller's own payment link (card / instant EFT via the seller's payment provider) | SA distributors, larger suppliers | Card/provider dispute rights | Seller confirmation on supplier page or webhook if the seller integrates |
| 3 | Distributor trade account / online checkout | SA distributors (local fast lane) | Local consumer and commercial law, local recourse | Order number + invoice upload |
| 4 | Bank transfer (T/T / EFT) to **verified** seller bank details | Factories without checkout | Lowest; fraud risk | Proof-of-payment upload + seller confirmation |
| 5 | Mobile money (where the seller accepts it) | Local sellers in Eswatini | Provider-dependent | Transaction reference + seller confirmation |

Rules:
- Easy Logi only shows payment options that are **on file and verified** for that seller. Never pass on payment details that arrived in a chat or email without ops verification.
- Bank details are verified once (call-back or video with the seller, matched against the business licence) and locked. **Any change triggers a hold**: the option is hidden, ops and the buyer are alerted, and it stays hidden until re-verified. This is the main fraud vector in cross-border parts buying.
- Deep links go only to allowlisted domains per seller.
- Recommend rank 1 or 2 options for new or unproven sellers; show rank 4 only for sellers with trust ≥ a set threshold or with an inspection booked.

## 6. Purchase flow

1. **Quote accepted** on the buyer quote page.
2. **Easy Logi fee invoice issued** (own payment link). The fit guarantee and tracking switch on when the fee is paid. Option per importer: fee billed monthly instead of per order.
3. **Purchase Pack generated** (code, no agent) and sent to buyer and seller. The seller confirms the order on the supplier page (price, quantity, lead time, reference code).
4. **Buyer pays the seller directly** using a listed option.
5. **Payment evidence captured**: webhook if available; otherwise the buyer uploads proof of payment and the `payment-proof-reader` agent extracts amount, date, currency, payee and reference. Code checks them against the Purchase Pack. Seller confirmation is required before the status advances.
6. **Deposit milestone**: order moves to `deposit_paid` only when evidence matches and the seller confirms.
7. **Production → QC**: Easy Logi cannot hold back the balance, so it protects the buyer by advising: "Don't pay the balance until QC passes." The balance link on the purchase page stays locked (greyed, with an explanation) until the QC gate is green, unless the buyer overrides with an acknowledgement.
8. **Balance paid** → same evidence check → `balance_paid`.
9. **Ship, clear, deliver** as per the main spec. Duties/VAT are paid by the importer to customs via the clearing agent, never through Easy Logi.
10. **Fit confirmed** → commission becomes billable to the seller on the next monthly statement.

**Local fast lane:** the buyer pays the SA distributor directly (rank 2 or 3), Easy Logi's fee is invoiced separately, and the distributor's referral commission is tracked by reference code.

## 7. Attribution and non-circumvention

Because buyers pay sellers directly, they learn who the seller is. Accept that, and protect the relationship in three ways:

- **Referral agreements** with every seller: commission on Easy Logi-referenced orders, plus repeat orders from a referred buyer for a set period (e.g. 12 months), whether or not the reference code is used. Include a non-circumvention clause.
- **Reference code everywhere**: payment reference, commercial invoice, packing list. The document checker flags invoices without it.
- **Value only through the platform**: fit guarantee, verified payment details, consolidation, customs pack, tracking and claims only apply to orders with an Easy Logi reference. A buyer who goes direct loses all of them.

**Public parts finder:** shows that a part is available, landed price ranges, delivery times and anonymised seller badges ("Verified factory · Ningbo · trust 92 · 38 orders"). The seller's identity and payment options appear only in the Purchase Pack, after the quote is accepted.

## 8. Status machine changes

- Add `pack_issued` (after `quoted`, once the Purchase Pack is generated and the fee is paid or billed to account).
- `deposit_paid` and `balance_paid` require a matched `payment_evidence` record **and** seller confirmation. Role: `system` may propose; `importer`/`ops_admin` or a seller confirmation may commit.
- Add side state `payment_mismatch` (evidence doesn't match the pack) that blocks progress until resolved.
- `fit_confirmed` triggers `commission.billable` for the seller.

## 9. Data model additions (schema-migrator)

| Table | Key fields |
| --- | --- |
| `seller_payment_options` | seller, type (marketplace / payment_link / trade_account / bank_transfer / mobile_money), details (encrypted), deep_link_domain, protection_rank, verified_at, verified_by, status (active / on_hold) |
| `payment_option_changes` | option, old/new values hash, detected_at, source, resolved_by, outcome |
| `purchase_packs` | order, seller, version, line snapshot, reference_code, payment_options snapshot, schedule, valid_until, superseded_by |
| `payment_evidence` | order, pack, milestone (deposit / balance / full), method, amount, currency, payee, reference, file, extracted_by, match_status, seller_confirmed_at |
| `fee_invoices` | order or org, amount, currency, status, provider_ref, paid_at |
| `referral_agreements` | seller, commission_rate (from rates_rules), repeat_window_days, signed_at, document |
| `commission_statements` | seller, period, lines, total, status |
| `attribution_codes` | code, order, buyer, seller, created_at |

## 10. Agents (small, single-job)

| Agent | Job | Trigger | Tools | Tier | Latency |
| --- | --- | --- | --- | --- | --- |
| `payment-proof-reader` | Extract amount, currency, date, payee and reference from a proof-of-payment image/PDF | `payment_evidence.uploaded` | none | Haiku-class vision | < 4 s |

Everything else here is plain code: Purchase Pack generation, evidence matching, bank-detail change detection, balance-link locking, commission calculation, attribution.

## 11. UI

- **Buyer purchase page** (magic link): pack summary, value line, ranked payment buttons, upload proof, milestone tracker, guarantee terms.
- **Supplier page** additions: confirm order, confirm payment received, see monthly commission statement.
- **Console**: seller payment-option verification queue, payment mismatch queue, fee invoices, commission statements, attribution report (orders by seller, suspected bypass).
- **Public parts finder**: search by vehicle/part, anonymised availability and price ranges, "Get a guaranteed quote" call to action into WhatsApp.

## 12. Build tasks for Claude Code

Paste into Claude Code from the repo root:

```
Read docs/commerce-model.md. It supersedes any assumption that Easy Logi holds money.
Plan first and wait for approval. Then, in small PRs, with reviewer + test-writer before each commit:

1. schema-migrator: add the tables in section 9, with RLS; encrypt seller payment details at rest.
2. Status machine: add pack_issued and payment_mismatch; require matched payment_evidence + seller
   confirmation for deposit_paid and balance_paid; emit commission.billable on fit_confirmed. Update the DB guard.
3. packages/commerce (pure code, fully tested): purchase pack builder, reference code generator,
   evidence matcher (amount/currency tolerance, reference, payee), payment option ranking,
   balance-link lock rule, commission calculator, value-line calculator (section 2).
4. Bank-detail change detection: any change to a seller payment option sets status on_hold,
   emits an alert event and requires ops re-verification.
5. agent-builder: create payment-proof-reader per section 10, with ≥ 10 evals incl. blurry, partial and
   wrong-reference cases.
6. apps/pages: buyer purchase page and supplier confirmation additions (section 11), using the magic-link service.
7. Console: verification queue, mismatch queue, fee invoices, commission statements.
8. Fee invoicing via a payment-link provider for Easy Logi's own fee only (behind an interface; provider TBD).
Acceptance: an order goes quote → pack → fee paid → deposit evidence matched + seller confirmed →
QC → balance → delivered → fit_confirmed → commission line on the seller's monthly statement,
with no buyer money touching Easy Logi.
```

## 13. Open questions

- [ ] Which China suppliers in the network support Trade Assurance or similar protected checkout for buyers in SA/Eswatini?
- [ ] Payment-link provider for Easy Logi's own fee (SA + Eswatini coverage, incl. mobile money).
- [ ] Legal review of referral agreements, non-circumvention and commission disclosure to buyers.
- [ ] Fit guarantee terms and reserve sizing (funded from the buyer service fee).
- [ ] Should importers on subscription get commission share on orders they route?
