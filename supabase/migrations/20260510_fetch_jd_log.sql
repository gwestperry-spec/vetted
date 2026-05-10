-- fetch_jd_log: every JD-fetch attempt (tier-1 Perplexity and tier-2
-- ScrapingBee) writes one row. Used by the internal dashboard to render
-- the JD-fetch success rate and the providers-used breakdown.
--
-- Schema is small on purpose: the table is observability, not state.
-- url_host (not full URL) avoids storing user-pasted URLs verbatim.
--
-- Already applied manually in production on 2026-05-10. Committed here
-- for traceability and so future Supabase environments can apply it.

create table if not exists fetch_jd_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  url_host text,
  provider text not null,        -- 'perplexity' | 'scrapingbee'
  success boolean not null,
  duration_ms int,
  error_code text
);

create index if not exists fetch_jd_log_created_at_idx
  on fetch_jd_log (created_at desc);

create index if not exists fetch_jd_log_success_created_idx
  on fetch_jd_log (success, created_at desc);
