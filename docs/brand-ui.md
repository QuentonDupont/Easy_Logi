# Easy Logi — Brand & UI spec ("Manifest")

Visual reference: the "Easy Logi Brand & UI" design canvas (brand board, public parts finder, importer console, buyer purchase page).

**Feel:** professional logistics — the calm, data-first look of modern freight platforms, without copying any one of them. Simple, fast, to the point, trustworthy. One dark ink, one signal colour, lots of white space, numbers in monospace.

## 1. Logo

**Mark: "Stack E".** Three cargo lanes form an E; the short middle lane ends in an orange dot — the part, found and on its way. Wordmark: `easylogi`, lowercase, one word, **easy** bold (700) + **logi** regular (400), IBM Plex Sans, letter-spacing −0.03em.

`packages/ui/src/brand/LogoMark.tsx` must render exactly this SVG (props: `size`, `variant: "dark" | "light"`):

```svg
<!-- dark variant (on light backgrounds) -->
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="14" fill="#0B1F33"/>
  <rect x="14" y="16" width="36" height="7" rx="3.5" fill="#FFFFFF"/>
  <rect x="14" y="28.5" width="22" height="7" rx="3.5" fill="#FFFFFF"/>
  <circle cx="44" cy="32" r="5" fill="#E8590C"/>
  <rect x="14" y="41" width="36" height="7" rx="3.5" fill="#FFFFFF"/>
</svg>
<!-- light variant (on Ink backgrounds): swap #0B1F33 and #FFFFFF; the dot stays #E8590C -->
```

Rules:
- The orange dot is the only orange in the logo. Never recolour it, never animate the bars apart.
- Minimum size 16 px (favicon). Clear space = the dot's diameter on every side.
- Export: `favicon.svg`, `favicon.ico` (16/32/48), `apple-touch-icon.png` (180), `icon-512.png`, OG image 1200×630 (mark + wordmark on Ink).
- `Logo.tsx` = mark + wordmark lockup, gap = 0.28 × mark size, wordmark font-size = 0.75 × mark size.

## 2. Design tokens

Put these in `packages/ui/src/tokens.css` as CSS variables and map them into the Tailwind config / shadcn theme. No other colours in product UI.

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#0B1F33` | Text, headers, primary dark surfaces, sidebar |
| `--ink-2` | `#1A3350` | Selected nav item on Ink |
| `--signal` | `#E8590C` | Logo dot, progress bars, small highlights. **Never** text on white or a fill under white text |
| `--signal-deep` | `#C2410C` | Primary CTA fill (white text), "needs action" |
| `--signal-tint` | `#FFF6F0` | Value/savings callouts, highlighted best-value row |
| `--steel` | `#4A5A6A` | Secondary text, captions, table headers |
| `--mist` | `#F4F6F8` | Page background |
| `--line` | `#D8DEE4` | Borders, dividers |
| `--line-soft` | `#EEF1F4` | Table row dividers, neutral pills |
| `--surface` | `#FFFFFF` | Cards, tables, inputs |
| `--transit` | `#1D5FA8` | In transit / at port status |
| `--cleared` | `#1F7A4D` | Cleared, delivered, fit confirmed, verified |
| `--cleared-tint` | `#E6F2EC` | "Verified fit" chip background |
| `--on-ink-muted` | `#C9D3DD` | Secondary text on Ink |

Type: **IBM Plex Sans** (UI and headings; 400/500/600/700) and **IBM Plex Mono** (order refs, part numbers, prices, dates, KPIs; 400/500). Load via `next/font/google`. Fallbacks: `'Helvetica Neue', sans-serif` and `monospace`.

| Style | Size / weight / tracking |
| --- | --- |
| Display (marketing hero) | 52 / 600 / −0.03em, line-height 1.08 |
| H1 (page title) | 28 / 600 / −0.02em |
| H2 (section) | 28–32 / 600 / −0.02em |
| Body | 15–16 / 400, line-height 1.5 |
| Label / table header | 12–13 / 600 / +0.06–0.12em uppercase, `--steel` |
| Data (mono) | 13–15 / 500 |

Spacing: 4-px base (4, 8, 12, 16, 20, 24, 32, 48, 64). Radius: 8 (inputs, buttons, pills), 12 (cards, tables), 14 (logo mark, hero search). Shadows: none; separation comes from `--line` borders. Max content width 1200 px (marketing), fluid (console).

## 3. Components (shadcn/ui, restyled with the tokens — no custom components where shadcn has one)

- **Button:** `primary` = `--signal-deep` fill, white text; `secondary` = 1 px `--ink` border, Ink text; `ghost` = `--line` border. Min height 44 px (48 on hero/phone).
- **StatusPill:** one component driven by the status machine. Map: needs action → `--signal-deep`/white; neutral states → `--line-soft`/Ink; shipped / at port / in transit → `--transit`/white; cleared / delivered / fit confirmed → `--cleared`/white. The map lives in `packages/ui`, generated from `ORDER_STATUSES`, so a new status fails typecheck until it has a colour.
- **Chip "Verified fit":** `--cleared-tint` background, `--cleared` text, 700.
- **KPI card:** label (13/600 `--steel`) + value (30/600 mono). The "Needs action" card has a 2 px `--signal-deep` border.
- **DataTable:** white, 12 px radius, 1 px `--line` border, `overflow-x: auto` wrapper, uppercase 12 px headers, 14 px rows, `--line-soft` row dividers, refs and numbers in mono.
- **SellerBadge:** anonymised ("Verified factory · Ningbo · Trust 92") until the Purchase Pack is issued, then the legal name.
- **ValueLine:** `--signal-tint` callout: "You save R… vs local retail · Fit guaranteed · Arrives …".
- **ProgressSteps:** 4-segment bar (Quote, Pay seller, QC, Delivery); done = `--signal`, pending = Ink-tinted.
- **PaymentOptionButton:** ranked list; rank 1 = primary with "Recommended · buyer protection" sub-line; locked options show a lock icon and the reason (e.g. "Balance unlocks after QC passes").
- Icons: Lucide, 1.75–2 px stroke. No emoji anywhere.

## 4. Screens

1. **Public parts finder** (`apps/pages` or a `apps/web` marketing app): white top nav (logo, Find parts, How it works, For importers, Track an order, Sign in, primary "Quote on WhatsApp"); Ink hero with headline "The right part, landed at a known price.", 3-field search (Vehicle, Part, VIN/part number) + "Find the part"; trust row with 3 ticks; results table with anonymised sellers, grade, arrival, landed price, CTA (best value row tinted); "Four steps. No guessing." section; three trust cards (Fit guarantee, Verified sellers, Customs handled); Ink importer CTA band; footer.
2. **Console · Orders** (`apps/console`): Ink sidebar (Orders, Fitment queue, Quotes, Supplier inbox, Shipments, Compliance, Sailings, Claims, Suppliers, Ops health — with count badges in `--signal` on Ink), page header with search + "New order", 4 KPI cards, filter tabs (All, Needs action, In production, At port, Delivered), orders table (Ref, Part + vehicle, Buyer, Seller, Status, ETA, Next action). Every other console screen reuses this shell.
3. **Buyer purchase page** (`apps/pages`, mobile-first, 390 px): Ink header with mark, order ref and ProgressSteps; part card with Verified fit chip and OEM number; ValueLine; landed price breakdown; Pay the seller section with SellerBadge, ranked PaymentOptionButtons and the balance-lock note; "Upload proof of payment"; WhatsApp help link.

## 5. Quality bar

- WCAG AA: 4.5:1 for text; `--signal` (#E8590C) is decoration only; use `--signal-deep` for anything with text.
- Touch targets ≥ 44 px; every interactive element is a real `<button>`, `<a>` or `<input>` with a label.
- Fast: marketing pages statically rendered, no client JS on the finder above the search box except the form; LCP < 2.0 s on a mid-range Android over 4G; fonts subset + `display: swap`; no images in the hero.
- Works at 360 px wide: sidebars stack, tables scroll in their own box, toolbars wrap.
- Copy: short sentences, numbers first, no hype words, no invented stats.

## 6. Claude Code prompt

```
Read docs/brand-ui.md. Implement the Easy Logi "Manifest" brand and UI. Plan first and wait for approval.
Small PRs, reviewer + test-writer before each commit, log deviations in docs/decisions.md.

1. Create packages/ui: tokens.css (section 2), Tailwind preset + shadcn theme mapped to the tokens,
   IBM Plex Sans/Mono via next/font, and LogoMark/Logo components rendering the exact SVG in section 1.
2. Generate brand assets into apps/*/public: favicon.svg, favicon.ico, apple-touch-icon.png, icon-512.png,
   og-image.png (script in scripts/brand-assets.ts so they can be regenerated).
3. Build the section 3 components in packages/ui on top of shadcn/ui. StatusPill's colour map must be
   typed against ORDER_STATUSES so a status without a colour fails typecheck. Add Storybook-free visual
   tests: a /dev/ui page in apps/console that renders every component and state.
4. Restyle apps/console to the Console · Orders layout (section 4.2) and apply the shell to all existing pages.
5. Build the buyer purchase page (section 4.3) in apps/pages, mobile-first, wired to the Purchase Pack data
   from docs/commerce-model.md (use fixtures until the pack service exists).
6. Build the public parts finder (section 4.1) as a statically rendered page with the search form posting to
   a stub endpoint; results table reads fixtures with anonymised SellerBadges.
7. Add an accessibility check (axe) and a Lighthouse CI budget (LCP < 2.0 s mobile, CLS < 0.1) to CI.
Acceptance: all three screens match the design canvas within reason at 1440 and 390 px, pass axe with
no serious issues, and use only the tokens in section 2.
```
