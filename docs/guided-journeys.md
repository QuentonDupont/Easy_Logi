# Easy Logi — Guided Import Journeys (step-by-step questionnaire with validations)

Builds on `docs/import-planner.md` (rule data) and must reuse its rules, gates and sources. Nothing here hard-codes a regulation: every step, question and check is **journey data** that points to rule rows with `source_url`, `as_of` and `verified`.

## 1. What it is

A guided, resumable questionnaire that teaches a buyer how to import, one step at a time, and **proves each step was done** before unlocking the next. It works like a sign-up flow: answer a question → get told exactly what to do and why (with the official source) → upload or enter the evidence → Easy Logi validates it → next step unlocks.

Two journeys:

| Journey | When | Runs |
| --- | --- | --- |
| **A. Importer readiness** | Once per importer per destination country | Gets the business legally ready to import (registrations, permits, approvals, bank) |
| **B. Shipment journey** | Once per shipment | Walks one order from HS code to reconciliation, using the import-planner timeline |

Journey B cannot start until the parts of Journey A it depends on are complete (e.g. SARS code active; Eswatini permit approved before the supplier deposit).

## 2. Principles

- **Questions decide the path.** Branching is data: "Destination?", "New or used?", "Is this a brake part, glass, fluid, seal, tyre or lighting?", "VAT registered?" Each answer adds or removes steps.
- **One action per step.** Every step has: plain-language instruction, why it matters, who to contact, documents needed, official source link + date, expected time, and cost if any.
- **Evidence, not ticks.** A step completes only when its validation passes, at the strongest level available (section 5).
- **Hard gates vs soft steps.** Legal gates (permits, LOA, ITAC, SARS code) block later steps. Advice steps (pre-shipment inspection, insurance) can be skipped with a recorded reason.
- **Unverified rules are labelled.** If a step's underlying rule is `verified = false`, the step shows "Confirm with your clearing agent" and accepts an agent confirmation as evidence.
- **Small agents only.** Validation is plain code wherever possible. Two new single-job agents read uploaded documents (section 7).
- **Resume anywhere.** Web page and WhatsApp share the same state. Nudges go in the daily digest, not as extra messages.

## 3. Journey A — Importer readiness

### A-ZA: South Africa

| # | Step | Branch condition | What the user does | Evidence | Validation | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| ZA-1 | Business details | always | Enter legal name, CIPC number, address | CIPC registration doc (upload) | doc-reader extracts reg no. + name; must match typed values | soft |
| ZA-2 | SARS customs client number (importer code) | always (commercial) | Register via SARS eFiling RLA (link org profile, assign RLA rights, submit; upload proof of address, certified ID, CIPC docs via Online Query System). Paper route DA 185 + 4A1 | SARS registration letter / RLA confirmation | doc-reader extracts customs client number + legal name; number format check (regex stored as data **[VERIFY format]**); name matches ZA-1 | **hard** (blocks Journey B) |
| ZA-3 | VAT registration | "VAT registered?" = yes | Enter VAT number | VAT certificate (optional) | format check (stored regex **[VERIFY]**); name match | soft (affects input-VAT messaging) |
| ZA-4 | NRCS Letter of Authority | will import brake friction (VC 8053), safety glass (VC 8051), brake/clutch fluid (VC 8013), cups & seals (VC 8080), tyres (VC 8056/8059), or lighting **[VERIFY]** | Apply to NRCS per product + manufacturer before importing; gather type-approval/test reports from supplier | LOA certificate per product/manufacturer | doc-reader extracts LOA number, product, manufacturer, issue + expiry; expiry > today; manufacturer must match the shipment's supplier later. Validity seeded 24 months **[VERIFY]** | **hard** for those products |
| ZA-5 | ITAC registration + permit | "Used, refurbished or remanufactured?" = yes | Explain rules first: resale of used car body/mechanical parts or half-cuts is **not permitted**; engines ≤3,000 cc petrol / ≤3,500 cc diesel and gearboxes only under quota (new entrants max R500,000 per 6 months); IE230 (needs SARS tax clearance + SAPS Second-hand Goods Act certificate) + IE461 | ITAC permit | doc-reader extracts permit no., goods, value limit, validity; shipment value must fit remaining quota | **hard**; resale of used car parts → journey stops with explanation |
| ZA-6 | Bank / authorised dealer | always | Confirm the bank that will pay suppliers; learn: advance payments allowed against invoice; payments **> R50,000** need customs clearance proof afterwards | Bank name (typed) | none (self-declared) | soft |
| ZA-7 | Clearing agent | always | Choose a licensed clearing agent (or Easy Logi partner) | Agent name + licence no. (typed) | agent exists in directory or ops confirms | soft (required before first shipment arrives) |

### A-SZ: Eswatini

| # | Step | Branch | What the user does | Evidence | Validation | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| SZ-1 | Company documents | always | Certificate of incorporation, memorandum & articles | uploads | doc-reader extracts company name + reg no.; names consistent | soft |
| SZ-2 | Trading licence | always | Ministry of Commerce trading licence | upload | doc-reader extracts holder + expiry; expiry > today | **hard** |
| SZ-3 | Tax clearance certificate | always | From ERS | upload | expiry > today; name match | **hard** |
| SZ-4 | ERS registration | always | Customs client/importer number (+ VAT if above threshold) | ERS registration letter | doc-reader extracts number + name | **hard** |
| SZ-5 | Understand the Ministry of Finance import permit | goods from outside SACU (default for new parts **[VERIFY in practice]**) | Learn the rules: apply **before ordering**; seven copies to the Principal Secretary, Ministry of Finance (Office 102, tel 2404-8145) by **Monday 4:00 pm**, considered **Wednesday**; first application triggers a **premises inspection**; fee = revenue stamps **E1 per E2,000 (or part)**; valid ~1 year **[VERIFY]**; return permit + endorsed bill of entry **within 3 days** of clearance | quiz (3 questions) | must answer correctly: "Can you order before the permit?" (No) · "Deadline?" (Monday 4 pm) · "After clearance?" (return within 3 days) | soft (learning step) |
| SZ-6 | VAT input-credit check | VAT registered | Learn s.28(5): no input credit on passenger-vehicle spare parts unless you deal in or hire such vehicles **[VERIFY per business]** | answer: "parts dealer / workshop / fleet" | stored; drives VAT messaging | soft |
| SZ-7 | Bank / authorised dealer | always | Eswatini authorised dealer bank; CMA payments unrestricted, non-CMA via bank with invoice, bill of entry afterwards **[VERIFY thresholds]** | bank name | self-declared | soft |
| SZ-8 | Clearing agent | always | Agent able to handle Durban clear / RIB to Matsapha / Maputo | name + licence | directory or ops | soft |

## 4. Journey B — Shipment journey (generated from import-planner timeline)

Each step pulls numbers from the planner (estimates with ranges, sources, dates) and records actuals for reconciliation.

| Phase | # | Step | Branch | Evidence | Validation | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| 0 Plan | B-1 | Describe the part | always | part, vehicle, **country of manufacture**, new/used | used + ZA + car part → stop (ITAC rule) | hard |
| | B-2 | Confirm HS code (8-digit) | always | HS code (hs-code-suggester proposes; user or agent confirms) | 8 digits; exists in duty_rates; agent confirmation if rule unverified | **hard** |
| | B-3 | Check approvals for this part | NRCS-regulated or used | links to ZA-4 / ZA-5 | LOA exists, unexpired, **manufacturer matches supplier**; ITAC quota sufficient | **hard** |
| | B-4 | Get a pro forma invoice | always | pro forma upload | invoice-reader: supplier name, line items, HS, quantities, values, **Incoterm present**, currency; supplier is verified in Easy Logi; warnings on EXW and China "DDP door-to-door" | hard |
| | B-5 | Choose mode + route | always | selection from planner comparison | chargeable weight computed; Eswatini route default per rules (small LCL → clear at Durban; FCL Manzini/Matsapha → RIB; north/east → Maputo if quote competitive) | soft |
| | B-6 | **Eswatini permit for this order** | SZ + non-SACU origin | permit application copy → approved permit | submission timestamp before Monday 16:00 → expected decision Wednesday (calendar calc); stamp amount = ceil(value/2000) × E1; on approval: doc-reader extracts permit no., goods, value, validity; **permit goods and value must cover the pro forma** | **hard: blocks deposit** |
| 1 Supplier | B-7 | Pay deposit | always | proof of payment (via commerce Purchase Pack) | payment-proof-reader: amount, currency, payee, reference matches pack; payee = verified bank details | hard |
| | B-8 | Pre-shipment inspection | recommended for new suppliers / high value | inspection report or skip reason | report-reader: pass/fail, date, PO ref | soft (skip with reason) |
| | B-9 | Pay balance | always | proof of payment | same as B-7; locked until QC pass or override acknowledged | hard |
| 2 Shipping | B-10 | Shipping documents | always | commercial invoice, packing list, B/L or AWB (+ CO if EU/EFTA/UK/SADC preference) | document-checker: invoice vs packing list vs PO (quantities, weights, HS, consignee, Easy Logi reference); CIF/CFR invoices itemise freight + insurance; CO present when claiming preference | hard |
| 3 Arrival | B-11 | Hand the pack to your clearing agent | always | agent confirms receipt (agent page) | agent click | hard |
| | B-12 | Pay destination charges | sea | invoices | amounts recorded vs estimate | soft |
| | B-13 | Duty + VAT assessed | always | SAD 500 / assessment from agent | assessed duty and VAT within tolerance of planner estimate (SA: 15% × (CV × 1.10 + duty); SZ: no uplift) — variance > threshold flags for review, not failure | hard (must be recorded) |
| | B-14 | Goods released | always | release notice | date recorded | hard |
| | B-15 | Delivery received | always | delivery photo / POD | photo present | hard |
| 4 After | B-16 | Return Eswatini permit | SZ | endorsed bill of entry + return confirmation | **≤ 3 days after release date**, else overdue alert | hard (compliance) |
| | B-17 | Bank proof for large advance payments | ZA + advance > R50,000 | bill of entry given to bank | self-declared + upload | soft |
| | B-18 | Reconcile | always | — | every plan line has actual or "none"; variance report generated | soft |
| | B-19 | Confirm fit | always | buyer yes/no | feeds fitment + claims | soft |

## 5. Validation levels (stored per step)

| Level | Meaning | Example |
| --- | --- | --- |
| 0 Self-declared | User ticked it | Bank name |
| 1 Format-checked | Code validated structure/dates/maths | 8-digit HS, Monday cut-off, stamp fee |
| 2 Document-read | Agent extracted fields from an upload and code matched them to typed or expected values | LOA manufacturer = supplier |
| 3 Cross-checked | Fields matched across documents | Permit value ≥ pro forma; invoice vs packing list |
| 4 Human-verified | Ops or clearing agent confirmed | Unverified rules, HS disputes |

Each step defines its **required level**. Failing checks return a specific, fixable message ("The LOA is for manufacturer X; your supplier is Y. You need an LOA for Y before ordering."). Never a generic error.

## 6. Data model (schema-migrator)

| Table | Key fields |
| --- | --- |
| `journey_templates` | id, kind (readiness/shipment), destination, version, published_at |
| `journey_steps` | template, code (ZA-2…), phase, order, title, instruction_md, why_md, cost_text, time_text, gate (hard/soft), required_level, branch_condition (JSON rule), depends_on[], rule_refs[] (→ rates_rules/permit_rules), evidence_schema (zod JSON), validators[] |
| `journey_questions` | step, key, prompt, type (choice/text/number/date/upload), options, sets_fact |
| `journey_runs` | org, template, subject (importer or order), status, started_at, completed_at |
| `journey_step_states` | run, step, status (locked/available/in_progress/needs_fix/done/skipped/blocked), level_reached, evidence_ids[], failures[], skip_reason, completed_by, completed_at |
| `journey_facts` | run, key, value, source (answer/document/system) |
| `journey_evidence` | run, step, file, extracted (JSON), extracted_by, checked_at |

Templates are versioned. Runs keep the version they started with; ops can migrate open runs when rules change (with a diff shown to the user).

## 7. Agents (new, single-job)

| Agent | Job | Trigger | Tools | Tier | Latency |
| --- | --- | --- | --- | --- | --- |
| `registration-doc-reader` | Extract fields (number, holder name, issue/expiry dates, scope, product, manufacturer, value limit) from one uploaded certificate/permit/licence | `journey_evidence.uploaded` (type = certificate/permit/licence) | none | Haiku-class vision | < 5 s |
| `journey-explainer` | Rewrite one step's instruction in simpler words or another language (siSwati, Zulu, Afrikaans) on request, without changing facts, numbers or links | `journey_step.explain_requested` | none | Haiku-class | < 3 s |

Reuse existing agents: `hs-code-suggester` (B-2), `document-checker` (B-10), `payment-proof-reader` (B-7, B-9). Everything else (branching, gates, calendars, maths, cross-checks) is plain code.

## 8. UI (Manifest brand)

- **Stepper page** (web + phone): left/top progress by phase; current step card with instruction, why, cost, time, source link + date, evidence upload, and a clear "What happens next".
- Status chips: Locked · Available · Needs fix · Done · Skipped · Blocked by [step].
- "Explain simpler" and language toggle (journey-explainer).
- "Ask my clearing agent" button on any unverified step → agent page confirmation.
- Dashboard card: "Ready to import into Eswatini: 6 of 8 steps" and per-shipment progress on the order page.
- WhatsApp: one step at a time ("Next: upload your trading licence"), photos accepted as evidence; reminders only inside the daily digest; deadline alerts (Monday permit cut-off, 3-day permit return) as exceptions.
- Ops: journey template editor (steps, branches, validators, rule links), runs needing human verification, overdue compliance (permit returns).

## 9. Claude Code command

```
Read docs/guided-journeys.md and docs/import-planner.md (plus CLAUDE.md, docs/commerce-model.md,
docs/brand-ui.md). Build Guided Import Journeys. Plan first and wait for approval. Small PRs; reviewer +
test-writer before each commit; log deviations in docs/decisions.md. Follow the small-agent rules.

1. schema-migrator: add the tables in section 6 with RLS. Seed journey templates A-ZA, A-SZ and B
   (sections 3–4) as data, linking each step to its rule rows from import-planner; steps whose rules are
   verified=false get required_level 4 or an agent-confirmation option.

2. packages/journeys (pure code, fully tested):
   - Branch engine: evaluate branch_condition against journey_facts; compute available/locked/blocked
     steps from depends_on and hard gates.
   - Validators library: hs8, dateNotExpired, nameMatches (fuzzy, threshold as data), regex-from-data
     (SARS/ERS/VAT formats seeded as unverified), eswatiniPermitCalendar (Monday 16:00 cut-off → next
     Wednesday decision), permitStampFee (E1 per E2,000 or part), permitCoversInvoice, loaManufacturerMatches,
     itacQuotaRemaining, permitReturnDeadline (release + 3 days), varianceWithinTolerance, documentConsistency
     (delegates to existing document-checker results).
   - Step completion: required validation level met → done; else needs_fix with a specific message.
   - Cross-journey gating: shipment steps check readiness steps (e.g. B-7 deposit blocked until B-6 permit
     approved and SZ-2/3/4 done; B-3 blocked without valid LOA/ITAC permit).
   - Template versioning + migration of open runs with a user-facing diff.

3. agent-builder: create registration-doc-reader and journey-explainer per section 7, each with ≥10 evals
   (blurry scans, expired documents, mismatched names, wrong document type; explainer must never change
   numbers, dates or links).

4. UI in apps/console and apps/pages (packages/ui components): stepper page, step card, evidence upload,
   status chips, "Explain simpler" + language toggle, "Ask my clearing agent", readiness dashboard card,
   per-order journey panel; ops template editor, human-verification queue, overdue-compliance list.

5. WhatsApp: one-step-at-a-time flow sharing the same journey state; photo uploads become evidence;
   reminders only via the daily digest; exception alerts for Monday permit cut-off and 3-day permit return.

6. Tests: full readiness run for ZA and SZ; used half-cut to ZA stops with the ITAC explanation; brake pads
   from a new manufacturer blocked until a matching LOA is uploaded; Eswatini order submitted Tuesday gets
   next-Monday cut-off and following-Wednesday decision; deposit blocked until permit approved; permit value
   below pro forma fails with a fix message; permit return on day 4 raises an overdue alert.

Acceptance: a new Eswatini importer can go from sign-up to "ready to import", start a China brake-pad
shipment, and be guided through every step to reconciliation, with each step proven by evidence at its
required validation level, unverified rules clearly labelled, and no step skippable where the law makes it
a gate.
```
