# services/channels

Channel adapters: `whatsapp/`, `email/`, `line/`, `wecom/`. Each adapter only **normalises**
inbound messages into the `messages` table shape and sends outbound messages — no business
logic, no agent calls. Message content is untrusted data (CLAUDE.md rule 6). Added in Phase 1+.
