-- ============================================================
-- CyberGuard Phase 2B — Add Shodan + Subdomain columns
-- Run in: Supabase SQL Editor → New Query
-- ============================================================

-- Add new scan data columns to scan_results
alter table public.scan_results
  add column if not exists ports_score   integer default 0,
  add column if not exists subdom_score  integer default 0,
  add column if not exists raw_shodan    jsonb default '{}'::jsonb,
  add column if not exists raw_subdoms   jsonb default '{}'::jsonb;

-- Score history view — used by the chart on Dashboard + Score pages
create or replace view public.score_history as
select
  domain_id,
  date_trunc('day', scanned_at) as day,
  avg(score)::integer            as score,
  min(score)::integer            as min_score,
  max(score)::integer            as max_score,
  count(*)::integer              as scan_count
from public.scan_results
group by domain_id, date_trunc('day', scanned_at)
order by day desc;

-- RLS on the view (inherits from scan_results via the underlying table)
-- Views use the RLS of their underlying tables automatically in Supabase
