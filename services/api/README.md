# services/api

Route handlers / Supabase edge functions. Phase 0 provides the in-app server actions inside
`apps/console`; this folder is where standalone webhooks and edge functions land in later phases
(WhatsApp inbound, supplier email inbound webhook, the pgmq consumer that drives
`services/workflows`). Empty on purpose until Phase 1.
