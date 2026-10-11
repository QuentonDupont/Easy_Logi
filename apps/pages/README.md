# apps/pages

Magic-link, no-login pages for external parties:

- **buyer quote** — a buyer approves/declines a quote
- **tracking** — a buyer follows an order
- **supplier quote** — a supplier submits a quote
- **clearing agent pack** — a clearing agent downloads the customs document pack

Each page is reached by a signed, expiring magic link (no account). Built in Phase 1+. Kept as a
separate Next.js app from `apps/console` so the public surface has no console code or auth.
