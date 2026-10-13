-- 04_rates_rules.sql — PLACEHOLDER rates, all marked verified = false ('verify').
-- CLAUDE.md rule 5: rates/duties/permits/routes live here with source + effective date and
-- are never hard-coded in code. These values are placeholders — verify against SARS / SACU /
-- Eswatini Revenue Service before any real landed-cost calculation.

insert into public.rates_rules (kind, key, value, source, effective_date, verified) values
  -- VAT is 15% in both SZL (Eswatini) and ZAR (South Africa) at time of writing — VERIFY.
  ('vat',        'ZA',        '{"rate": 0.15}'::jsonb,            'verify-with-clearing-agent', '2026-01-01', false),
  ('vat',        'SZ',        '{"rate": 0.15}'::jsonb,            'verify-with-clearing-agent', '2026-01-01', false),
  -- ATV uplift (the "+10%") applied to the SA customs value (= FOB) before VAT — VERIFY with the
  -- clearing agent; the VAT base is FOB, not CIF (see packages/costing/src/landedCost.ts).
  ('vat_uplift', 'ZA',        '{"rate": 0.10}'::jsonb,            'verify-with-clearing-agent', '2026-01-01', false),
  ('vat_uplift', 'SZ',        '{"rate": 0.10}'::jsonb,            'verify-with-clearing-agent', '2026-01-01', false),
  -- Illustrative duty rates by category — VERIFY against the tariff book + HS codes.
  ('duty',       'auto_parts_general', '{"rate": 0.20}'::jsonb,   'placeholder:verify', '2026-01-01', false),
  ('duty',       'tyres',     '{"rate": 0.25}'::jsonb,            'placeholder:verify', '2026-01-01', false),
  -- Placeholder FX pairs (units of `to` per 1 `from`) — VERIFY against a live feed.
  ('fx',         'USD_ZAR',   '{"rate": 18.20}'::jsonb,           'placeholder:verify', '2026-01-01', false),
  ('fx',         'ZAR_USD',   '{"rate": 0.055}'::jsonb,           'placeholder:verify', '2026-01-01', false),
  ('fx',         'CNY_ZAR',   '{"rate": 2.55}'::jsonb,            'placeholder:verify', '2026-01-01', false),
  ('fx',         'THB_ZAR',   '{"rate": 0.52}'::jsonb,            'placeholder:verify', '2026-01-01', false),
  -- SZL is pegged 1:1 to ZAR under the Common Monetary Area — VERIFY.
  ('fx',         'ZAR_SZL',   '{"rate": 1.0}'::jsonb,             'placeholder:verify', '2026-01-01', false)
on conflict do nothing;
