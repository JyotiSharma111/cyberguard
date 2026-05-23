-- CyberGuard — Vendor risk tracking table
-- Run in Supabase SQL Editor

create table if not exists public.vendors (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  domain       text not null,
  name         text,                    -- display name e.g. "Salesforce"
  category     text,                    -- e.g. "CRM", "Cloud Infrastructure"
  score        integer,
  grade        text,
  dns_score    integer default 0,
  ssl_score    integer default 0,
  email_score  integer default 0,
  issues       jsonb default '[]'::jsonb,
  raw_dns      jsonb default '{}'::jsonb,
  raw_ssl      jsonb default '{}'::jsonb,
  last_scanned timestamptz,
  created_at   timestamptz not null default now(),
  unique(user_id, domain)
);

alter table public.vendors enable row level security;

create policy "vendors_own" on public.vendors for all
  using (auth.uid() = user_id);
