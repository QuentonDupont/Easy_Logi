# <agent-name>

**Job (one sentence):** <the single thing this agent does>

| Field | Value |
| --- | --- |
| Trigger event | `<event.name>` |
| Output event | `<event.name>` |
| Tools | none (max 2) |
| Model tier | haiku \| sonnet |
| Timeout | 10 s |
| Max output tokens | 512 |
| Latency target (p95) | < 3 s |
| On low confidence / budget breach | emit `<event>.needs_human` |

**Not this agent's job:** <list nearby jobs that belong to other agents>
