# fitment-ranker

**Job (one sentence):** Rank the already-retrieved candidate parts by fit and give an overall confidence — never inventing a part number.

| Field | Value |
| --- | --- |
| Trigger event | `candidates.retrieved` |
| Output event | `fitment.ranked` |
| Tools | none (max 2) |
| Model tier | sonnet |
| Timeout | 15 s |
| Max output tokens | 1024 |
| Latency target (p95) | < 5 s |
| On low confidence / budget breach | emit `match.low_confidence` |

**Not this agent's job:** retrieving candidates (plain code), extracting intent (`part-intent-extractor`), or asking the buyer a follow-up (`clarifier`). It only reorders the candidates it is given (CLAUDE.md rule 1).
