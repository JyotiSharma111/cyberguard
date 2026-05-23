-- ============================================================
-- CyberGuard Phase 3 — Billing tables
-- Run in Supabase SQL Editor
-- ============================================================

-- Add Stripe fields to profiles
alter table public.profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists trial_ends_at timestamptz;

-- Billing events log (audit trail of payments/upgrades)
create table if not exists public.billing_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  event_type   text not null,  -- 'subscribed','upgraded','downgraded','cancelled','payment_failed'
  plan_from    text,
  plan_to      text,
  amount_cents integer,
  currency     text default 'usd',
  stripe_event_id text unique,
  created_at   timestamptz not null default now()
);

alter table public.billing_events enable row level security;
create policy "billing_own" on public.billing_events for all using (auth.uid() = user_id);

-- Plan limits reference (used by API to enforce limits)
-- free:     1 domain, 1 share link
-- pro:      3 domains, 10 share links, staff email upload, PDF reports, Slack alerts
-- business: 10 domains, unlimited share links, API access, branded reports
