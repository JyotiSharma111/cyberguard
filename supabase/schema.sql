-- ============================================================
-- CyberGuard — Complete Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create extension if not exists "pgcrypto";

-- PROFILES (extends auth.users)
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  org_name    text,
  plan        text not null default 'free' check (plan in ('free','pro','business')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, org_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'org_name', split_part(new.email,'@',2))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- DOMAINS
create table if not exists public.domains (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade not null,
  name           text not null,
  status         text not null default 'pending' check (status in ('pending','verified','failed','revoked')),
  verify_token   text not null default encode(gen_random_bytes(16), 'hex'),
  verified_at    timestamptz,
  last_scanned   timestamptz,
  created_at     timestamptz not null default now(),
  unique(user_id, name)
);

-- SCAN RESULTS
create table if not exists public.scan_results (
  id           uuid primary key default gen_random_uuid(),
  domain_id    uuid references public.domains(id) on delete cascade not null,
  score        integer not null default 0 check (score >= 0 and score <= 100),
  grade        text,
  dns_score    integer default 0,
  ssl_score    integer default 0,
  email_score  integer default 0,
  cred_score   integer default 0,
  issues       jsonb default '[]'::jsonb,
  raw_dns      jsonb default '{}'::jsonb,
  raw_ssl      jsonb default '{}'::jsonb,
  raw_creds    jsonb default '{}'::jsonb,
  scanned_at   timestamptz not null default now()
);

create index if not exists idx_scan_domain_time on public.scan_results(domain_id, scanned_at desc);

-- STAFF EMAILS
create table if not exists public.staff_emails (
  id             uuid primary key default gen_random_uuid(),
  domain_id      uuid references public.domains(id) on delete cascade not null,
  email          text not null,
  name           text,
  breach_count   integer default 0,
  breach_sources text[],
  last_checked   timestamptz,
  created_at     timestamptz not null default now(),
  unique(domain_id, email)
);

-- ALERTS
create table if not exists public.alerts (
  id          uuid primary key default gen_random_uuid(),
  domain_id   uuid references public.domains(id) on delete cascade not null,
  type        text not null,
  severity    text not null default 'high' check (severity in ('critical','high','medium','low')),
  title       text not null,
  detail      text,
  sent_via    text[],
  sent_at     timestamptz not null default now(),
  read_at     timestamptz
);

-- SHARE LINKS
create table if not exists public.share_links (
  id          uuid primary key default gen_random_uuid(),
  domain_id   uuid references public.domains(id) on delete cascade not null,
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  label       text,
  expires_at  timestamptz not null default (now() + interval '30 days'),
  revoked     boolean not null default false,
  views       integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ROW LEVEL SECURITY
alter table public.profiles     enable row level security;
alter table public.domains       enable row level security;
alter table public.scan_results  enable row level security;
alter table public.staff_emails  enable row level security;
alter table public.alerts        enable row level security;
alter table public.share_links   enable row level security;

create policy "profiles_own" on public.profiles for all using (auth.uid() = id);
create policy "domains_own"  on public.domains  for all using (auth.uid() = user_id);

create policy "scan_results_own" on public.scan_results for all using (
  exists (select 1 from public.domains d where d.id = scan_results.domain_id and d.user_id = auth.uid())
);
create policy "staff_emails_own" on public.staff_emails for all using (
  exists (select 1 from public.domains d where d.id = staff_emails.domain_id and d.user_id = auth.uid())
);
create policy "alerts_own" on public.alerts for all using (
  exists (select 1 from public.domains d where d.id = alerts.domain_id and d.user_id = auth.uid())
);
create policy "share_links_own" on public.share_links for all using (
  exists (select 1 from public.domains d where d.id = share_links.domain_id and d.user_id = auth.uid())
);
-- Anyone can read a valid non-expired share link (for public dashboard view)
create policy "share_links_public_read" on public.share_links for select
  using (revoked = false and expires_at > now());
