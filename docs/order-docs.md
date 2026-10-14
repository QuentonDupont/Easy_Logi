# Easy Logi — Order Lanes, Status Summaries & Document Packs

Builds on `docs/import-planner.md` (rules), `docs/guided-journeys.md` (steps + validation levels) and `docs/commerce-model.md` (Purchase Pack). All summaries, document requirements and checks are **data**, not code.

## 1. Order lane: where it comes from and where it goes

Every order gets a **lane**, shown as a header on the order page, tracking page, WhatsApp digest and every generated document:

> **Ningbo, China → Durban → Matsapha, Eswatini** · Sea LCL · FOB · Made in China

| Field | Example | Why it matters |
| --- | --- | --- |
| Country of manufacture | China | Duty, preference, anti-dumping |
| Ship-from country, city | China, Ningbo | Export rules, transit time |
| Origin port/airport | Ningbo (CNNGB) | Freight lane, documents |
| Supplier (verified) | Ningbo Brake Components Co. | Invoice/LOA match |
| Mode | Courier / air / sea LCL / sea FCL | Documents (AWB vs B/L), charges |
| Incoterm + named place | FOB Ningbo | Who pays what (import-planner §6) |
| Entry port | Durban (ZADUR) or Maputo (MZMPM) | Port charges, route |
| Route (Eswatini) | Clear at Durban / RIB to Matsapha / Maputo corridor | Bond, where duty is paid |
| Destination country, town | Eswatini, Matsapha | Tax engine, permits |
| Consignee (importer of record) | Legal name, address, SARS/ERS number | Must match on every document |
| Delivery address | Buyer's shop | Last-mile, POD |

Rules:
- Lane is set at quote stage and **locked at `pack_issued`**. Any later change creates a lane version, re-runs the planner gates and regenerates affected documents.
- Lane fields are stored using UN/LOCODE for ports and ISO 3166 codes for countries.

## 2. Status summaries (buyer-facing)

Each status has: a one-line **summary**, **what happens next**, **who acts**, **documents** (download / upload), and the **check** that lets the order move on. Text is stored in `status_content` so ops can edit wording without a release.

| Status | Summary (shown to buyer) | Next / who acts | Download from Easy Logi | Upload for cross-check | Check before moving on |
| --- | --- | --- | --- | --- | --- |
| `requested` | We've got your request and are identifying the exact part. | Easy Logi matches the part | — | Part photo, licence disc (optional) | — |
| `matched` | We've found the part that fits your vehicle. | You confirm the match | Part match sheet (OEM no., fit notes) | — | Buyer confirmation |
| `quoted` | Your landed-price quote is ready to review. | You accept or ask questions | Quote with landed-cost breakdown | — | Acceptance |
| `pack_issued` | Your Purchase Pack is ready: who to pay, what, and how. | You pay the Easy Logi fee; seller confirms order | **Purchase Pack**, **Supplier instruction sheet**, Purchase order | Seller's **pro forma invoice** | Pro forma matches PO: seller, items, qty, price, Incoterm, consignee, Easy Logi reference |
| *(Eswatini, non-SACU)* `permit_pending` | We're waiting for your Eswatini import permit before any deposit is paid. | You submit by Monday 4 pm; Ministry decides Wednesday | **Permit application letter** (pre-filled), document checklist, stamp-fee calculation | Submitted application copy, then **approved permit** | Permit goods + value cover the pro forma; permit valid |
| `deposit_paid` | Your deposit reached the seller. Production can start. | Seller produces | Payment instructions (from pack) | **Proof of payment** | Amount, currency, payee, reference match the pack; seller confirms |
| `in_production` | Your parts are being made or picked. | Seller updates; we chase | — | — | — |
| `qc_pending` | Quality-check photos or inspection report are being reviewed. | Easy Logi / inspector | Inspection booking sheet (optional) | QC photos or **inspection report** | Photos match confirmed part; report = pass |
| `qc_passed` | Quality check passed. You can now pay the balance. | You pay balance | Balance payment instructions | **Proof of payment** | Same as deposit |
| `balance_paid` | Balance paid. The seller is preparing shipping documents. | Seller books freight | **Shipping document requirements sheet** (what invoice/packing list/B/L must say) | Draft **commercial invoice**, **packing list** | Consistency check (§4) before goods ship |
| `shipped` | Your parts are on their way. | Carrier | Tracking summary | **Bill of lading / air waybill / courier waybill**, final invoice + packing list, certificate of origin (if claiming preference) | Docs consistent with each other and the PO; B/L consignee = importer of record |
| `at_consolidation` | Your goods are at the consolidation warehouse waiting for the shared container. | Warehouse | Warehouse receipt | Warehouse receipt (if supplier-delivered) | Received qty/weight vs packing list |
| `at_port_durban` / `at_port_maputo` | Your goods have arrived at the port and are being cleared. | Clearing agent | **Clearing agent pack** (zip: all docs + HS codes + permit/LOA + summary) | Agent receipt (agent page click) | Agent confirms pack complete |
| `customs_cleared` | Customs has released your goods. Duty and VAT are recorded. | Transport | Duty/VAT estimate vs actual | **Bill of entry (SAD 500) / release notice**, duty & VAT assessment | Assessed duty/VAT within tolerance of estimate (flag if not) |
| `in_transit_road` | Your goods are on the road to you. | Haulier | Delivery note | — | — |
| `delivered` | Delivered. Please check the parts. | You confirm receipt | **Proof of delivery form** | Signed POD or delivery photo | POD present; qty matches |
| *(Eswatini)* `permit_return_due` | Return your import permit within 3 days of clearance. | You | **Permit return cover letter** (pre-filled) | Return confirmation + endorsed bill of entry | Uploaded ≤ 3 days after release |
| `fit_confirmed` | The part fitted. Thank you. | — | Order summary + reconciliation | — | — |
| `payment_mismatch` | A payment doesn't match your Purchase Pack. Nothing moves until it's fixed. | You / Easy Logi | — | Corrected proof | Match passes |
| `on_hold` | Your order is paused: [reason]. | Shown per reason | — | As requested | Ops clears |
| `disputed` | We're resolving a problem with this order. | Easy Logi + seller | Claim pack | Claim photos | Claim decision |
| `cancelled` | This order was cancelled. | — | Cancellation summary | — | — |

Note: `permit_pending` and `permit_return_due` are added to the status machine and only apply when the lane's destination is Eswatini and origin is outside SACU (rule data). The guided journey steps (B-6, B-16) are the same checks; the status and journey must read from one source.

## 3. Documents Easy Logi generates

Easy Logi generates **pre-filled templates, cover letters and checklists**. It does **not** re-create official government forms: those are linked from their official source (e.g. SARS DA 185, ITAC IE230/IE461, NRCS application forms) with the date the link was checked. Users, suppliers and agents still sign and submit.

| Template | Filled from | For whom |
| --- | --- | --- |
| Part match sheet | Fitment result | Buyer |
| Quote / landed-cost breakdown | Planner + quote | Buyer |
| Purchase Pack | Commerce model | Buyer |
| Purchase order (bilingual EN + CN/TH where relevant) | Pack + lane | Seller |
| **Supplier instruction sheet** | Lane + rules | Seller: exact consignee name/address/number; Incoterm + named place; 8-digit HS per line; country of manufacture; Easy Logi reference on invoice and packing list; CIF/CFR → freight and insurance itemised; weights + dimensions per carton; CO needed only if claiming EU/EFTA/UK/SADC preference; NRCS-regulated parts must match the LOA manufacturer |
| **Shipping document requirements sheet** | Same | Seller / forwarder |
| Eswatini permit application letter | Importer profile + pro forma + lane | Importer → Principal Secretary, Ministry of Finance (with the 7-copy, Monday 4 pm, stamp-fee instructions) |
| Stamp-fee calculation | Pro forma value | Importer |
| Inspection booking sheet | PO + part specs + photos | Inspector |
| Clearing agent pack (zip) | All verified docs + summary + HS + permit/LOA refs | Clearing agent |
| Proof of delivery form | Order | Buyer / driver |
| Permit return cover letter | Permit + bill of entry | Importer → Ministry of Finance |
| Order summary + reconciliation | Plan lines | Buyer |

Every generated document carries:
- Manifest branding (docs/brand-ui.md), the **lane header**, order reference `EL-XXXX-XXXX`, document type, version number and generation date.
- A **QR code** encoding order ref + document type + version, so an uploaded scan can be matched to the right order and step automatically.
- A footer: "Prepared by Easy Logi from your order data. Estimates are not quotes. Check official requirements with your clearing agent."

## 4. Upload & cross-check

When a user uploads a document:
1. **Identify**: read the QR (if it's our template) or classify the document type (existing message/document classification).
2. **Extract**: `document-checker`, `registration-doc-reader` or `payment-proof-reader` extracts fields (no new agent needed).
3. **Cross-check (code)** against order data and other documents:

| Check | Compared against |
| --- | --- |
| Consignee name, address, SARS/ERS number | Lane consignee (exact/fuzzy threshold as data) |
| Seller name | Verified supplier |
| Easy Logi reference | Order ref |
| Incoterm + named place | Lane |
| Line items, quantities, unit prices, currency, totals | PO / Purchase Pack |
| HS codes (8-digit) | Confirmed HS per line |
| Country of manufacture | Lane |
| Gross/net weights, carton count, dimensions | Packing list ↔ invoice ↔ B/L/AWB |
| Freight + insurance itemised | Required when Incoterm is CIF/CFR/DDP |
| Certificate of origin | Required only when preference is claimed |
| LOA manufacturer | Supplier (NRCS-regulated lines) |
| Permit goods + value + validity | Pro forma / invoice (Eswatini) |
| Dates | Permit valid on clearance date; permit return ≤ 3 days after release |
| Payment amount, payee, reference | Purchase Pack |

4. **Result**: each check = pass / warn / fail with a specific message ("Invoice consignee 'Swazi Parts' doesn't match your registered name 'Swazi Parts Co (Pty) Ltd'. Ask the seller to correct it before shipping."). The order only advances when all **required** checks pass at the step's validation level (guided-journeys §5). Warnings can be accepted with a recorded reason.
5. **Versioning**: re-uploads create a new version; the latest verified version is used in the agent pack. Old versions stay visible in the document history.

## 5. Order page layout (Manifest)

- **Lane header** (from → via → to, mode, Incoterm, made in).
- **Current status card**: summary, what happens next, who acts, deadline if any.
- **Documents panel** for the current status: "Download" (templates) and "Upload" (required evidence) with check results inline.
- **Timeline** of all statuses with dates, each expandable to its documents.
- **Document history**: every document, version, uploader, check result.
- Phone purchase page and WhatsApp use the same status summary text.

## 6. Data model (schema-migrator)

| Table | Key fields |
| --- | --- |
| `order_lanes` | order, version, country_of_manufacture, ship_from_country, ship_from_city, origin_locode, supplier, mode, incoterm, named_place, entry_locode, route, dest_country, dest_town, consignee (snapshot), delivery_address, locked_at |
| `status_content` | status, audience (buyer/importer/supplier/agent), summary, next_text, who_acts, version |
| `status_doc_requirements` | status, condition (JSON over lane/order facts), doc_type, direction (download/upload), required (bool), required_level, checks[] |
| `doc_templates` | doc_type, version, languages, template file, fields schema |
| `order_documents` | order, doc_type, direction, version, file, qr_payload, generated_from (template version), uploaded_by, extracted (JSON), check_results (JSON), status (pending/passed/warned/failed), superseded_by |
| `official_form_links` | form code (DA 185, IE230, IE461, NRCS forms…), authority, url, checked_at |

## 7. Claude Code command

```
Read docs/order-docs.md, plus docs/import-planner.md, docs/guided-journeys.md, docs/commerce-model.md,
docs/brand-ui.md and CLAUDE.md. Build order lanes, status summaries and document packs. Plan first and
wait for approval. Small PRs; reviewer + test-writer before each commit; log deviations in docs/decisions.md.
No new agents: reuse document-checker, registration-doc-reader and payment-proof-reader.

1. schema-migrator: add the tables in section 6 with RLS. Seed status_content (section 2, buyer audience
   first), status_doc_requirements (section 2 table) and official_form_links (with checked_at).
2. Status machine: add permit_pending (between pack_issued and deposit_paid) and permit_return_due
   (after customs_cleared), active only when lane.dest_country = SZ and origin is outside SACU (rule data).
   Transitions into the next status require all required documents for the current status to be passed.
   Journey steps B-6/B-16 and these statuses must read the same validation results.
3. Order lanes: capture at quote stage, lock at pack_issued, version on change (re-run planner gates and
   regenerate affected documents). Render the lane header everywhere: order page, tracking page, WhatsApp
   digest, every generated document.
4. packages/documents (pure code + tests):
   - PDF generation for each template in section 3, Manifest branding, lane header, order ref, version,
     date, QR (order ref + doc type + version), standard footer. Bilingual PO and supplier instruction sheet
     (EN + zh-CN / th).
   - Clearing agent pack: zip of latest verified documents + summary sheet.
   - Eswatini permit application letter and stamp-fee calculation (E1 per E2,000 or part); permit return
     cover letter.
   - Official government forms are linked, never re-created.
5. Upload pipeline: QR read → classify → extract (existing agents) → cross-checks in section 4 as code
   (thresholds as data) → pass/warn/fail with specific fix messages → versioned order_documents.
6. UI (packages/ui): lane header component, current-status card, documents panel (download + upload with
   inline check results), status timeline with per-status documents, document history; ops view of failed
   checks. Same summaries on the phone purchase page and in WhatsApp.
7. Tests: China→Matsapha LCL FOB order runs through permit_pending (blocks deposit until permit covers
   pro forma); invoice with wrong consignee fails with fix message; CIF invoice without itemised freight
   fails; packing list weight ≠ B/L weight fails; QR-matched upload lands on the right order/step;
   permit return on day 4 raises overdue; lane change after pack_issued creates a new version and
   regenerates documents.

Acceptance: for any order, the buyer sees where it comes from and where it's going, a plain summary of the
current status, the documents to download, the documents to upload, and exactly why an upload passed or
failed; the order cannot advance past a document-dependent status until its required documents pass.
```
