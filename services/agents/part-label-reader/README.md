# part-label-reader

**Job (one sentence):** Read the part number(s) and brand off a photo of a part or its label.

| Field | Value |
| --- | --- |
| Trigger event | `request.photo_added` |
| Output event | `request.label_read` |
| Tools | none (max 2) |
| Model tier | sonnet (vision) |
| Timeout | 15 s |
| Max output tokens | 512 |
| Latency target (p95) | < 5 s |
| On low confidence / budget breach | emit `match.low_confidence` |

**Not this agent's job:** extracting intent from text (`part-intent-extractor`), retrieving or ranking candidates (`fitment-ranker` / plain code), or deciding the fit (a human confirms in the console). It reports only what is legible in the image (CLAUDE.md rule 1).

> **Evals:** the real reading is a vision task; `pnpm eval` does not yet attach images to cases, so the golden set here exercises the schema/plumbing. A true vision eval needs image support in the eval harness (follow-up).
