-- ============================================================
-- CyberGuard — Scheduled daily rescans via pg_cron
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable pg_cron extension (already available in Supabase)
create extension if not exists pg_cron;

-- Create a simple rescan_queue table that the API polls
-- (Supabase pg_cron can't call external HTTP directly on free tier,
--  so we queue domains and the server processes them)
create table if not exists public.rescan_queue (
  id          uuid primary key default gen_random_uuid(),
  domain_id   uuid references public.domains(id) on delete cascade not null,
  queued_at   timestamptz not null default now(),
  processed   boolean not null default false,
  processed_at timestamptz
);

alter table public.rescan_queue enable row level security;

-- Only the service role can read/write the queue (server-side only)
-- No user-facing RLS needed

-- Queue all verified domains for rescan every day at 2am UTC
-- (pg_cron on free tier: use Supabase scheduled functions instead)
-- Alternative: call /api/cron/rescan from a free cron service like cron-job.org

-- Function to queue all active domains
create or replace function public.queue_daily_rescans()
returns void language plpgsql security definer as $$
begin
  insert into public.rescan_queue (domain_id)
  select id from public.domains
  where status = 'verified'
    and (last_scanned is null or last_scanned < now() - interval '23 hours')
  on conflict do nothing;
end;
$$;

-- Schedule it (if pg_cron is available on your plan)
-- select cron.schedule('daily-rescan', '0 2 * * *', 'select public.queue_daily_rescans()');
-- To check: select * from cron.job;

comment on table public.rescan_queue is 'Domains queued for automatic rescan. Processed by the API server.';
