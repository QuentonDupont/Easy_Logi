# Agent roster (15 single-job agents)

| Agent (folder) | Its one job | Trigger event | Tools | Model tier | Latency target | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| message-classifier | Label inbound message: request, approval, claim, quote, document, chatter | message.received | none | Haiku | < 2 s | 1 |
| part-intent-extractor | Vehicle hints, category, position from buyer text/voice transcript | request.created | none | Haiku | < 3 s | 1 |
| part-label-reader | Read numbers and brands off a part photo, with confidence | request.photo_added | none | Sonnet vision | < 5 s | 1 |
| fitment-ranker | Rank retrieved candidates, give reasons and a 0–1 confidence | candidates.retrieved | none | Sonnet | < 5 s | 1 |
| clarifier | Write ONE disambiguation question with 2–3 buttons | match.low_confidence | none | Haiku | < 2 s | 1 |
| rfq-translator | Render RFQ text in Chinese or Thai, numbers locked | rfq.created | none | Haiku | < 4 s | 2 |
| message-linker | Match an unlinked supplier message to an order | supplier_message.unlinked | search_orders | Haiku | < 3 s | 2 |
| quote-extractor | Supplier reply/attachment → quote fields | supplier_message.quote | none | Haiku | < 4 s | 2 |
| event-extractor | Delays, price changes, QC and document events from a message | supplier_message.linked | none | Haiku | < 4 s | 2 |
| reply-drafter | Draft one chase or clarification reply | event.needs_reply | get_order_summary | Sonnet | < 6 s | 2 |
| hs-code-suggester | Propose HS code + rationale per order line | order_line.awarded | search_tariff | Sonnet | < 5 s | 3 |
| document-checker | Compare invoice vs packing list vs PO | document.uploaded | get_po_lines | Sonnet | < 8 s | 3 |
| qc-photo-comparer | Compare QC photos with the confirmed part | qc_photos.received | get_reference_images | Sonnet vision | < 8 s | 4 |
| claim-triager | Propose a root cause from claim photos | claim.opened | get_order_media | Sonnet vision | < 8 s | 4 |
| digest-writer | Write one buyer's daily WhatsApp digest | daily cron | none | Haiku | batch | 2 |

Plain code, NOT agents: VIN/chassis decode, PDF417 reading, candidate retrieval (SQL + pgvector),
supplier suggestion scoring, chaser scheduling, landed cost, status machine, trust scores,
consolidation fill and cost splits.
