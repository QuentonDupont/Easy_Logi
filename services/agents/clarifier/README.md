# clarifier

**Job (one sentence):** Write one disambiguation question with 2–3 options when intent or ranking confidence is too low to proceed.

| Field | Value |
| --- | --- |
| Trigger event | `match.low_confidence` |
| Output event | `clarification.requested` |
| Tools | none (max 2) |
| Model tier | haiku |
| Timeout | 10 s |
| Max output tokens | 384 |
| Latency target (p95) | < 3 s |
| On low confidence / budget breach | emit `match.low_confidence` |

**Not this agent's job:** extracting intent (`part-intent-extractor`), retrieving or ranking candidates (`fitment-ranker` / plain code), or deciding the final part (a human does that in the console).
