# part-intent-extractor

**Job (one sentence):** Turn one buyer's free-text part request into a structured intent (vehicle + part category + descriptors).

| Field | Value |
| --- | --- |
| Trigger event | `request.created` |
| Output event | `request.intent_extracted` |
| Tools | none (max 2) |
| Model tier | haiku |
| Timeout | 10 s |
| Max output tokens | 512 |
| Latency target (p95) | < 3 s |
| On low confidence / budget breach | emit `match.low_confidence` |

**Not this agent's job:** reading part photos (`part-label-reader`), retrieving candidate parts (plain code), ranking candidates (`fitment-ranker`), or asking the buyer a follow-up (`clarifier`).
