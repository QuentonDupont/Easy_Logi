# Easy Logi — International Shipping Planner (spec + rule data)

This is the rule data and build spec for the planner that shows a buyer every step, document and payment, in order, for importing auto parts into **South Africa** or **Eswatini** from **China, India, Thailand, Japan, UAE** (plus brief Turkey/Germany). Research date: October 2026.

**Golden rules**
- Every number is **rule data**, not code: stored in `rates_rules` / planner tables with `source_url`, `source_name`, `as_of`, `verified` (bool), `verify_note`.
- Anything marked **[VERIFY]** below seeds with `verified = false`, and the UI shows "Estimate — confirm with your clearing agent".
- Outputs are **estimates, never quotes**. Freight is always shown as a range with its date.
- Destination rules drive most of the result; origin adds the export layer.

---

## 1. Inputs the planner collects

| Input | Notes |
| --- | --- |
| Destination country | `ZA` or `SZ` |
| Destination town | Drives route + road leg (e.g. Johannesburg, Manzini, Matsapha) |
| **Country of manufacture** | Ask this explicitly, NOT "ship-from". Drives preference + anti-dumping |
| Ship-from country/port | May differ (e.g. Japanese parts shipped from Dubai) |
| Part type + HS code (8-digit) | HS suggester agent proposes; user/agent confirms. **Block if unknown** |
| New / used / refurbished / remanufactured | Refurbished and remanufactured are treated as **used** for ITAC [VERIFY per product] |
| Goods value + currency + Incoterm | EXW, FCA, FOB, CFR, CIF, DAP, DDP |
| Freight + insurance shown separately on invoice? | Needed to back out FOB under CIF/CFR/DDP |
| Cartons: count, L×W×H cm, gross kg | Drives chargeable weight |
| Urgency | Days the buyer can wait |
| Importer status | SA: SARS customs code active? VAT registered? Eswatini: ERS registered, trading licence, tax clearance, MoF permit? |

---

## 2. Destination: South Africa

### 2.1 Registration
- **SARS customs client number** via RLA on eFiling (link org profile, assign RLA rights, submit; upload proof of address, certified ID, CIPC docs via SARS Online Query System). Paper route: DA 185 + annexure 4A1. Non-resident importers need a registered agent (DA 185.D). Source: SARS Importers page; SARS RLA page.
- **ITAC** (only for used/controlled goods): IE230 importer registration (needs SARS tax clearance; for used engines/parts also SAPS Second-hand Goods Act certificate) + IE461 commercial permit. Source: ITAC guidelines.
- **NRCS LOA** before importing/selling regulated components (2.3).

### 2.2 Documents
Commercial invoice (must show Incoterm; under CIF/CFR/DDP freight and insurance itemised), packing list (gross/net kg, dimensions), B/L or AWB or courier waybill, SAD 500 (agent via EDI), NRCS LOA number if regulated, ITAC permit if used, proof of payment (valuation queries), freight/insurance invoices if invoice is CIF/CFR. Certificate of origin only helps for EU (EUR.1 / origin declaration), EFTA, UK, SADC.

### 2.3 NRCS compulsory specifications (hard gate)

| Component | Spec | Requirement |
| --- | --- | --- |
| Laminated & toughened safety glass | VC 8051 | LOA + type-approval docs |
| Brake friction material (pads, shoes, linings) | VC 8053 | LOA + type-approval docs |
| Hydraulic brake & clutch fluid | VC 8013 | LOA |
| Elastomeric cups & seals (brake/clutch hydraulic) | VC 8080 | LOA |
| Passenger tyres | VC 8056 (ECE R30) | NRCS approval / homologation, E-mark |
| Commercial tyres | VC 8059 (ECE R54) | As above |
| Headlamps, secondary lights, replacement bulbs | In NRCS scope | Treat as regulated **[VERIFY exact VC + LOA need]** |

LOA is **product- and manufacturer-specific**: a new supplier for the same part = new LOA. Validity conflict: NRCS AC Form 001 (Ed 6) offers 12 or 24 months; TÜV says 3 years + 2-year extension. Seed **24 months [VERIFY]**. Missing LOA → port hold.

### 2.4 Valuation, duty, VAT (official)
- **Customs value = FOB transaction value** (freight and insurance from export port excluded). Source: SARS External Policy SC-CR-A-03 "Valuation of Imports", Rev 5, effective 11 Dec 2025.
- **Duty** = customs value × 8-digit rate from SARS Tariff Book Schedule 1 Part 1; check Schedule 2 for anti-dumping.
- **Import VAT** = 15% × [(customs value × 1.10) + non-rebated duties]. Source: SARS "Duties and Taxes for Importers"; SARS guide CE-G06.
- **No 10% uplift** where goods originate in **and** are imported from Botswana, Lesotho, Namibia or Eswatini (BLNE).
- VAT-registered importers can claim import VAT as input tax.

**Test cases (must pass):**
1. SARS example: customs value R1,000, duty 5% → duty R50, ATV R1,150, VAT **R172.50**.
2. Brake pads FOB R100,000, duty 20% → duty R20,000, ATV R130,000, VAT **R19,500**, total to SARS **R39,500**.
3. Same goods, BLNE origin+import → no uplift.

### 2.5 Duty rate seeds (planner must look up 8-digit; these are fallbacks only)

| HS | Goods | General rate | Preference | Status |
| --- | --- | --- | --- | --- |
| 8708.30 | Brakes, pads, discs | 20% (some lines 0–30%) | — | Secondary source (JLog from SARS tariff, Aug 2026) |
| 8708.99 | Other vehicle parts | 20% | SADC free, EU EPA free, UK EPA free, EFTA free; AfCFTA 20% | Secondary (JLog) |
| 8708 other subheadings | Bumpers, gearboxes, axles, wheels, suspension, radiators, clutches, steering | Commonly 20%, some 0–30% | | [VERIFY] |
| 8421 | Filters | 0–15% | | [VERIFY] |
| 8511 | Spark plugs, starters, alternators | 0–20% | | [VERIFY] |
| 8512 | Lighting, wipers, horns | 0–20% | | [VERIFY] |
| 4011 | New tyres | ~25%; anti-dumping has applied to some Chinese tyres | | [VERIFY Sch 1 + Sch 2] |
| 8483 | Shafts, gears, housings | 0–15% | | [VERIFY] |
| 8415 | Vehicle A/C units | varies | | [VERIFY] |

**Preference rules:** China, India, Thailand, Japan, UAE, Turkey → **no preference into SACU** (general rates). India–SACU PTA: Terms of Reference signed 12 Aug 2026, talks to conclude within a year; nothing in force — re-check 2027. **Germany/EU** → SADC–EU EPA duty-free on e.g. 8708.99 with valid EU origin proof. **EU goods via Dubai** keep EU origin but preference only if direct-transport/non-manipulation rules are met [VERIFY].

### 2.6 Low-value / courier
Before 1 Sep 2024: ≤R500 paid 20% flat duty, no VAT. SARS release 8 Aug 2024: VAT added from 1 Sep 2024; WCO re-banding from 1 Nov 2024; de minimis concession removed Nov 2024. **Planner rule: no VAT de minimis in SA.** Every parcel pays 15% VAT + duty + courier disbursement fee. Commercial parts → full tariff. Flag ≤R500 parcels [VERIFY current LVC treatment].

### 2.7 Used parts into SA (ITAC) — hard gate
- **All used/second-hand goods need an ITAC permit.**
- Used passenger/LDV petrol engines ≤3,000 cc, diesel ≤3,500 cc, and gearboxes: permit under a value quota; **new entrants max R500,000 per 6 months**; ~15% annual growth for existing importers.
- Used differentials: bona fide re-conditioners only.
- Other used mechanical/body parts for cars/LDVs: **private individuals only**, for accident repair, with SAPS + insurance reports.
- Used heavy-truck spares: only if not available locally.
- Clear-cut permits ~4–5 working days.
- **Default: commercial import of used car body/mechanical parts or half-cuts for resale = NOT PERMITTED.**
- Source: ITAC guidelines (Jan 2016 version, still published, "may change without notice") [VERIFY currency].

### 2.8 Durban port & destination charges (seeds)

| Charge | Billed by | Seed | Status |
| --- | --- | --- | --- |
| TNPA cargo dues, full import container | TNPA via line/agent | FY25/26: R1,879.72/20ft, R3,759.42/40ft. FY26/27 +7.80% → ~R2,026/20ft, ~R4,053/40ft from 1 Apr 2026 | Tariff book + Ports Regulator ROD; FY26/27 is derived [VERIFY] |
| TPT terminal handling | Line/terminal | Per TPT 2025 tariff book per container size | [VERIFY current line] |
| DTHC, delivery order, container deposit, cleaning | Shipping line | Varies by line; deposits often waived with line credit | [VERIFY per line] |
| LCL CFS/unpack, DO, handling | Consolidator | Per W/M + minimum | [VERIFY] |
| Clearing agent fee | Agent | From ~R1,800 per entry (one Durban agent, JLog 2026) + disbursement fee ~2–3.5% of duty/VAT paid + EDI/docs | Disbursement % [VERIFY] |
| Storage/demurrage/detention | Terminal/line | Free time ~3–7 days terminal, 7–14 days line, then escalating | [VERIFY] |
| Road Durban→JHB | Haulier | 40ft ~US$500–1,100 (mid-2026, Dantful) | Indicative |

### 2.9 Timeline & stops
Release 1–3 working days if not stopped. Common stops: HS disputes (8708 vs 8421/8511/8512), undervaluation (China invoices below reference prices), missing NRCS LOA, used goods without ITAC permit (incl. "refurbished"/"remanufactured"), counterfeit/IP holds, mismatched weights/descriptions between B/L, invoice and packing list.

### 2.10 Exchange control (SA)
All cross-border payments via an Authorised Dealer (bank) or ADLA. Advance payments for permissible imports allowed against invoice; **advance payments >R50,000 → importer must present customs clearance docs after goods clear** (SARB FAQ). BoP codes per payment (bank-side). Companies can apply for an "imports undertaking dispensation" (Section B.1(H)). No restrictions within the CMA (SA, Lesotho, Namibia, Eswatini).

---

## 3. Destination: Eswatini

### 3.1 Registration
ERS customs client/importer number (+ VAT if over threshold). SAD 500 (or "Form E" for personal declarations under E15,000). Ministry of Commerce trading licence + tax clearance (prerequisites for the permit).

### 3.2 Ministry of Finance import permit — hard gate
- Required for goods from **outside SACU** on the Import Control Order list, which includes **"9. Automotive Parts"** (not qualified as used), plus "Used Motor Vehicles" and "Used Tires/Tire Casings". **Default: new parts from non-SACU origins need a permit.** [VERIFY in practice]
- **Apply before ordering** ("goods already ordered will not establish any claim or priority").
- Apply in writing to the Principal Secretary, Ministry of Finance (Office 102, tel 2404-8145).
- First application: certificate of incorporation, memorandum & articles, trading licence, tax clearance, original supplier pro forma invoices → **premises inspection**. Later: trading licence, tax clearance, pro formas.
- **Seven copies by Monday 4:00 pm; considered Wednesday.** (Missing Monday can cost ~10 days.)
- **Fee:** revenue stamps **E1.00 per E2,000 (or part)** of value; Revenue Office receipts accepted.
- **Validity:** 1 year, non-transferable (WTO TPR, not on Ministry page) [VERIFY].
- **After use:** return the permit + certified bill of entry (bank + customs endorsed) **within 3 days** of clearance.
- **No permit → goods detained**, fines, seizure.
- Parts bought from SA stockists (SACU trade) fall outside the wording [VERIFY treatment of foreign-made parts resold by SA stockists].

### 3.3 Duty & VAT
- Duty: SACU common external tariff (same rates as SARS tariff).
- **VAT = 15% × (customs value + duty + excise + other fiscal charges + import-related services not already in customs value). NO 10% uplift.** Source: Eswatini VAT Act 2011 s.23; PwC.
- **Value base open question:** FOB vs landed. Seed default: **CIF to Eswatini border + Durban charges + duty**, configurable, [VERIFY].
- No confirmed ERS de minimis for commercial goods — ignore third-party "US$50" claims.
- VAT Act s.28(5): **no input credit on passenger-vehicle spare parts** unless the business deals in or hires such vehicles (dealer vs workshop matters) [VERIFY per user].

### 3.4 Routes

| Route | How | Documents / charges | Default use |
| --- | --- | --- | --- |
| 1. Clear at Durban | Entered at Durban for Eswatini | SAD 500, permit, invoice; Durban charges (2.8) | Small LCL. [VERIFY entry purpose code so VAT accrues to ERS] |
| 2. In bond (RIB) Durban → Matsapha | SARS transit entry + bonded carrier → Matsapha ICD/dry port, cleared there | Transit declaration, RIB bond, Eswatini SAD 500 at Matsapha, permit; road ~4–6 h. Benchmark: report to Matsapha within 2 working days | FCL to Manzini/Matsapha |
| 3. Maputo corridor | Ship to Maputo → Mozambican transit by road (Namaacha/Lomahasha) or rail (Goba) → cleared at Eswatini border | MCNet transit declaration, transit bond/guarantee (Ministerial Diploma 10/2002), electronic seal (Diploma 19/2023), Eswatini SAD 500 + permit; road fee ~US$100 at Lomahasha/Mhlumeni; border open 07:00–00:00 | Northern/eastern Eswatini FCL when Maputo quote is competitive. Historic bond-valuation friction |

Goods must be cleared under a customs procedure within **7 days** of importation; transit/in-bond requires security for suspended duties.

### 3.5 Timeline
Durban release 1–3 days + transit same day–2 days + Matsapha clearance 1–3 days + weekly permit cycle. Delays: no permit or permit not matching invoice, bond expiry/inadequate bond, Durban congestion, HS/valuation issues.

### 3.6 Exchange control (Eswatini)
Central Bank of Eswatini, via authorised dealers. CMA payments unrestricted. Non-CMA via an Eswatini authorised dealer bank with invoice; expect to present the bill of entry afterwards [VERIFY thresholds].

---

## 4. Origin profiles (seed)

Export procedures not individually cited below are standard practice → `verified = false`, "forwarder to confirm".

| Origin | Export side | Preference into SACU | Incoterms quoted | Ports → Durban transit | Seed freight (dated) | Payment | Pitfalls |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **China** | China Customs export declaration by supplier/agent; invoice, packing list, B/L/AWB; optional CCPIT CO. No general export restriction on parts | None | EXW, FOB Shanghai/Ningbo/Shenzhen/Qingdao, CFR/CIF Durban, DDP "door to door" | Shanghai ~22d, Shenzhen ~22d, Ningbo ~23d, Qingdao ~24d, Tianjin ~26d; another forwarder 22–30d FCL / 36–48d LCL door-to-door; air 3–7d; express 3–6d | Oct 2026 (sino-shipping): 20GP US$3,533–4,318; 40GP US$4,275–5,225; LCL US$220/CBM; air US$5.7/kg. Jun 2026 (Dantful): Shanghai 20ft US$1,500–2,200, 40ft US$2,400–3,600. Mid-2026 (DTFU): 40ft US$2,000–3,500 | T/T 30/70; Alibaba Trade Assurance; L/C large orders | Bank-detail change fraud; traders posing as factories; B/L release before payment; counterfeit OEM; remanufactured sold as new (= used for ITAC); brake pads without LOA test reports; under-declared "DDP" consolidators |
| **India** | IEC (DGFT), GST, LUT; AD Code at port on ICEGATE (needed for shipping bill); shipping bill HS must match invoice; supplier claims RoDTEP | None in force; PTA ToR signed 12 Aug 2026 | FOB Nhava Sheva/Mundra/Chennai, CIF Durban, EXW small | ~14–25d [VERIFY]; air 3–6d | Quote required | T/T; L/C larger suppliers | Grey-market "OE-equivalent", HS mismatch shipping bill vs invoice, packing quality |
| **Thailand** | Customs export via e-Customs/NSW; Form C/O from DFT/Chamber [VERIFY] | None | FOB Laem Chabang/Bangkok, CIF Durban | ~18–30d, often via Singapore/Port Klang [VERIFY]; air 3–6d | Quote required | T/T; L/C | Genuine OE and "OEM-equivalent" both exist (Toyota/Isuzu/Mitsubishi bakkie parts) → verify brand authorisation |
| **Japan** | NACCS export declaration; used engines/half-cuts need registration-cancellation/export certificate; JCC CO [VERIFY] | None | FOB/CIF | ~25–35d Yokohama/Nagoya/Kobe/Osaka [VERIFY] | Quote required | T/T | **Used parts into SA: see 2.7 (resale of used car parts/half-cuts not permitted).** Into Eswatini: permit list includes automotive parts + used tyres. Odometer/engine-number mismatch, oil/coolant residues, misdescribing used as new |
| **UAE (Dubai)** | Dubai Customs export/re-export via Mirsal/Dubai Trade; re-export certificate; Jebel Ali free-zone stock [VERIFY] | Depends on **country of manufacture**, not UAE | FOB Jebel Ali, CIF | ~12–20d [VERIFY]; air 1–3d | Quote required | T/T, cash-heavy | Grey-market and used sold as new; EU preference via Dubai only with direct-transport proof |
| **Turkey** | — | None known [VERIFY] | — | ~25–35d [VERIFY] | Quote required | — | — |
| **Germany (EU)** | Often EXW/FCA from distributors | **SADC–EU EPA: e.g. 8708.99 duty-free with EUR.1 / approved exporter declaration** | EXW/FCA | ~22–30d Hamburg/Bremerhaven [VERIFY] | Quote required | — | Claim the preference |

All supplier payments: always verify bank-detail changes by phone on a known number. Recommend pre-shipment inspection (SGS, QIMA, Bureau Veritas, Intertek) for new suppliers.

---

## 5. Chargeable weight & mode recommendation

| Mode | Rule | Density |
| --- | --- | --- |
| Express courier | max(actual kg, L×W×H cm ÷ **5000**) | 1 CBM = 200 kg |
| Air cargo | max(actual kg, L×W×H cm ÷ **6000**) | 1 CBM ≈ 167 kg |
| Sea LCL | W/M: max(CBM, tonnes), usually 1 CBM minimum | 1 CBM = 1,000 kg |

**Test case:** 25 kg carton 50×40×30 cm (0.06 CBM): courier volumetric 12 kg → chargeable 25 kg; air volumetric 10 kg → chargeable 25 kg; LCL billed at 1 CBM minimum.

**Default thresholds (overridable by live quotes):** courier < ~50–70 kg chargeable; air ~70–300 kg or urgent; LCL > ~1–2 CBM or a few hundred kg when time allows; FCL > ~13–15 CBM (20ft).
`crossover_kg ≈ (LCL freight + LCL fixed origin/destination costs) ÷ courier rate per kg` — compute per quote, never hard-code.
Courier all-in rate seed US$8–12/kg [VERIFY with live quote].

---

## 6. Incoterm responsibility matrix

| Cost | EXW | FCA/FOB | CFR/CIF | DAP | DDP |
| --- | --- | --- | --- | --- | --- |
| Pickup, export clearance, origin THC | **Buyer** | Seller | Seller | Seller | Seller |
| Main freight | Buyer | Buyer | Seller | Seller | Seller |
| Insurance | Buyer | Buyer | Buyer (CFR) / Seller min. cover (CIF) | Seller (own risk) | Seller |
| Destination THC, DO, cargo dues | Buyer | Buyer | Buyer (line may collect) | Seller to unloading [VERIFY] | Seller |
| Duty, VAT, clearance | Buyer | Buyer | Buyer | **Buyer** | Seller in theory — **flag**: foreign sellers rarely hold a SARS code, so a third party clears in its own name |
| Inland delivery | Buyer | Buyer | Buyer | Seller to named place | Seller |

Planner guidance: **recommend FCA/FOB**; warn on EXW (buyer's forwarder must handle foreign export clearance); **warn on China "DDP door-to-door"** (undervaluation risk, no input VAT, goods cleared in someone else's name). Under CIF, SARS still needs FOB → freight/insurance must be itemised.

---

## 7. Step & payment timeline template (generated per shipment)

**Phase 0 — Gates (blocking)**
0.1 Confirm 8-digit HS + duty rate (block if unknown).
0.2 SA: SARS code active; NRCS LOA if VC-regulated; ITAC permit if used (block ordering until in place).
0.3 Eswatini: MoF permit from supplier pro forma, submitted by Monday 4 pm (block supplier deposit until approved).
0.4 Optional pre-shipment inspection booking.

**Phase 1 — Supplier**
1.1 Deposit (typically 30%) → record FX rate + bank charges.
1.2 Production → inspection report → balance (70%) before loading or against B/L copy (L/C: on compliant documents).

**Phase 2 — Origin & freight** per Incoterm matrix.

**Phase 3 — Destination (sea via Durban)**
3.1 Arrival notice.
3.2 Pay destination charges (DTHC, DO, cargo dues / CFS) → DO released.
3.3 Agent lodges SAD 500 with LOA/ITAC/Eswatini permit before/at arrival.
3.4 Duty + VAT to SARS (or deferment) — or, Eswatini route 2: RIB bond lodged, duty/VAT paid at Matsapha to ERS.
3.5 Release (or stop/NRCS inspection).
3.6 Agent fee + disbursement + storage if free time exceeded.
3.7 Road transport (or bonded carrier → Matsapha → ERS clearance + payment).
3.8 FCL: return container within detention free time; reclaim deposit.
3.9 Post-clearance: SA advance payments >R50,000 → give bank customs docs; Eswatini → return permit + endorsed bill of entry within 3 days; claim input VAT.
3.10 Reconcile every line estimated vs actual.

**Courier variant:** supplier ships → courier clears (own or importer code) → invoices duty + VAT + disbursement before/on delivery. Regulated parts still need the LOA; Eswatini parcels may be held without the permit.
**Air variant:** AWB replaces B/L; airline/terminal handling replaces port charges; no container items.

**Reconciliation lines:** deposit FX, balance FX, origin charges, freight, insurance, destination charges, duty, VAT, agent fee, disbursement, storage/demurrage, permit stamps, transport, other. Each line: `estimate_low`, `estimate_high`, `actual`, `paid_to`, `paid_at`, `evidence`.

---

## 8. Routing defaults

- SA destination: Durban; road to destination.
- Eswatini small LCL → **clear at Durban**.
- Eswatini FCL to Manzini/Matsapha → **RIB in bond to Matsapha**.
- Northern/eastern Eswatini FCL with competitive Maputo quote → **Maputo corridor**.

---

## 9. Must-verify list (seed as `verified = false`, show to ops)

1. 8-digit duty rates + anti-dumping per SKU (4011, 8708 subheadings, 8421, 8511, 8512, 8483, 8415).
2. SA ≤R500 low-value treatment after Nov 2024.
3. FOB adjustment for CIF/DDP invoices and related-party pricing.
4. NRCS: which lighting items need an LOA; LOA fees, lead times, validity (12/24 months vs 3 years); tyre approval process.
5. Whether a remanufactured/refurbished part is "used" for ITAC.
6. Eswatini: permit needed in practice for **new** parts from every non-SACU origin; current fee, validity, turnaround; treatment of foreign-made parts bought from SA stockists.
7. Eswatini VAT value base (FOB vs landed) and SAD 500 procedure codes for clear-at-Durban vs in-bond to Matsapha.
8. RIB bond amount/type, bonded carrier requirements, transit time limits Durban → Matsapha.
9. Maputo: Mozambican transit bond cost, MCNet fees, e-seal charges, border fees.
10. TNPA FY26/27 cargo dues lines, TPT handling for 20/40ft and LCL, line DO/DTHC/deposit policies.
11. SARB and Central Bank of Eswatini document thresholds for advance payments.
12. Origin export procedures + transit times for India, Thailand, Japan, UAE, Turkey, Germany; live lane quotes.
13. Eswatini s.28(5) input-VAT restriction on passenger-vehicle spare parts per user type.

---

## 10. Sources (store as `source_url` on rules)

SARS tariff: tariff.sars.gov.za · SARS Duties & Taxes for Importers: sars.gov.za/customs-and-excise/duties-and-taxes/duties-and-taxes-for-importers · SARS VAT on imports guide CE-G06 · SARS valuation policy SC-CR-A-03 Rev 5 · SARS RLA: sars.gov.za/customs-and-excise/registration-licensing-and-accreditation · ITAC: itac.org.za/import-control · NRCS automotive: nrcs.org.za/business-units/automotive · TNPA/Ports Regulator tariff book: portsregulator.org · TPT tariff book: transnetportterminals.net · SARB Currency & Exchanges Manual + FAQ: resbank.co.za · ERS customs rules: ers.org.sz/CustomExcise/GeneralRules · Eswatini Ministry of Finance import permits: gov.sz (article 327) · Eswatini VAT Act 2011 · WTO TPR WT/TPR/S/447 (Eswatini) · Eswatini Trade Information Portal: eswatinitradeportal.com · Mozambique MCNet: mcnet.co.mz · India ICEGATE/DGFT · China Single Window · Freight seeds: sino-shipping.com (Oct 2026), dantful.com (Jun 2026), dtfulogistics.com (mid-2026), jlog.co.za (2026) · DHL volumetric rules · Freight News (24 Aug 2026, India–SACU PTA).

---

## 11. Claude Code command

```
Read docs/import-planner.md (rule data + spec), docs/spec.md, docs/commerce-model.md and docs/brand-ui.md.
Build the International Shipping Planner. Plan first and wait for approval. Small PRs; run reviewer and
test-writer before each commit; log deviations in docs/decisions.md. Follow CLAUDE.md agent rules:
everything here is plain code except HS-code suggestion (existing hs-code-suggester agent).

1. Data (schema-migrator):
   - Extend rates_rules or add planner tables: destinations, origins, routes, port_charges, freight_lanes,
     duty_rates (hs8, origin_group, rate, preference_basis), regulated_components (spec code, HS/keywords,
     requirement, validity_months), permit_rules, incoterm_matrix, timeline_templates, shipment_plans,
     plan_lines (estimate_low/high, actual, paid_to, paid_at, evidence), rule_verifications.
   - Every rule row: source_name, source_url, as_of, verified (bool), verify_note.
   - Seed ALL values from sections 2–9. Anything marked [VERIFY] seeds verified=false.

2. packages/import-planner (pure functions, 100% tested):
   - chargeableWeight(mode, cartons) with ÷5000 courier, ÷6000 air, LCL W/M with 1 CBM minimum.
   - modeRecommendation(cartons, urgency, quotes) using the crossover formula; thresholds are data.
   - toCustomsValueFOB(invoice, incoterm, freight, insurance) — backs out freight/insurance for CIF/CFR/DDP.
   - saTaxes(customsValue, dutyRate, origin, importedFrom): duty + VAT = 15% × (CV × 1.10 + duty);
     no uplift for BLNE origin+import. Must pass the SARS R172.50 example and the R39,500 brake-pad example.
   - szTaxes(...): duty on SACU tariff; VAT = 15% × (value base + duty + other charges), NO uplift;
     value base configurable (default CIF to border + Durban charges), flagged unverified.
   - preference(countryOfManufacture, hs): none for CN/IN/TH/JP/AE/TR; EU EPA/EFTA/UK/SADC per seeds.
   - gates(plan): NRCS LOA (VC 8051/8053/8013/8080, tyres VC 8056/8059, lighting flagged), ITAC used-parts
     rules incl. "resale of used car parts/half-cuts not permitted", Eswatini MoF permit before deposit
     (Monday 4 pm cut-off → next Wednesday decision date, E1 per E2,000 stamp calc), SARS code, ERS registration.
   - route options for Eswatini (Durban clear / RIB to Matsapha / Maputo) with defaults from section 8.
   - incotermResponsibilities(incoterm) from section 6, incl. DDP and EXW warnings.
   - buildTimeline(plan): Phase 0–3 steps from section 7 with who-pays-whom, documents and dates.
   - reconcile(plan, actuals): per-line variance + remaining to pay.
   Fix packages/costing so it delegates SA/SZ tax maths to these functions (single source of truth).

3. Console + public UI (packages/ui, Manifest brand):
   - Public "Import planner" page: inputs from section 1 (country of manufacture asked explicitly),
     output = gates (red/amber/green), mode comparison with ranges and dates, landed-cost estimate with
     breakdown, step-by-step payment & document timeline, Incoterm advice, "Estimate — confirm with your
     clearing agent" on any unverified rule, and "Book this through Easy Logi" CTA into RFQ/consolidation.
   - Saved plans (account) with live reconciliation: estimated vs paid vs remaining per line.
   - Ops screen "Rule verification": list unverified/stale (> 90 days) rules, edit with source + date,
     mark verified by clearing agent; change history.
   - Origin guide pages (SEO, static): China, India, Thailand, Japan, UAE → South Africa / Eswatini,
     rendered from the same rule data.

4. Jobs: weekly stale-rule report (as_of > 90 days or verified=false) to ops; FX refresh already exists.

5. Tests: all worked examples above; chargeable-weight test case; Eswatini permit calendar
   (submit Tue → next Monday cut-off); gates for brake pads (LOA), used half-cut to SA (blocked),
   new parts China→Eswatini (permit required before deposit), EU-origin 8708.99 (duty-free with proof).

Acceptance: a user can plan "brake pads, made in China, 0.4 CBM, FOB, to Manzini" and get the permit gate,
LOA gate, mode comparison, route recommendation, landed-cost ranges with sources/dates, a full timeline,
and a reconciliation view — with every unverified rule visibly labelled.
```
