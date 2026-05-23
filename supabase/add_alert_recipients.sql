-- ============================================================
-- CyberGuard — Add alert recipients + alert_settings
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- Alert recipients — owner email is always included automatically
-- Extra emails are added here by the owner
create table if not exists public.alert_recipients (
  id          uuid primary key default gen_random_uuid(),
  domain_id   uuid references public.domains(id) on delete cascade not null,
  email       text not null,
  name        text,                         -- optional label e.g. "IT Manager"
  active      boolean not null default true, -- checkbox to enable/disable
  created_at  timestamptz not null default now(),
  unique(domain_id, email)
);

-- Alert settings per domain — what triggers an alert and where
create table if not exists public.alert_settings (
  id                  uuid primary key default gen_random_uuid(),
  domain_id           uuid references public.domains(id) on delete cascade not null unique,
  -- What triggers alerts (checkboxes)
  alert_score_drop    boolean not null default true,   -- score drops > 10 points
  alert_cert_expiry   boolean not null default true,   -- SSL cert < 30 days
  alert_new_critical  boolean not null default true,   -- new critical issue found
  alert_dmarc_fail    boolean not null default true,   -- DMARC policy is none/missing
  alert_breach_found  boolean not null default true,   -- new credential breach
  -- How often
  weekly_digest       boolean not null default true,   -- weekly summary email
  -- Channels (checkboxes)
  channel_email       boolean not null default true,   -- always on for owner
  channel_slack       boolean not null default false,  -- slack webhook
  slack_webhook_url   text,                            -- filled in when slack enabled
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Alert log — record of every alert sent
create table if not exists public.alert_log (
  id          uuid primary key default gen_random_uuid(),
  domain_id   uuid references public.domains(id) on delete cascade not null,
  type        text not null,     -- 'score_drop','cert_expiry','new_critical','breach','weekly_digest'
  severity    text not null default 'high',
  subject     text not null,
  body_html   text,
  recipients  text[],            -- emails it was sent to
  sent_at     timestamptz not null default now(),
  error       text               -- null if sent ok, error message if failed
);

-- RLS
alter table public.alert_recipients enable row level security;
alter table public.alert_settings   enable row level security;
alter table public.alert_log        enable row level security;

create policy "alert_recipients_own" on public.alert_recipients for all using (
  exists (select 1 from public.domains d where d.id = alert_recipients.domain_id and d.user_id = auth.uid())
);
create policy "alert_settings_own" on public.alert_settings for all using (
  exists (select 1 from public.domains d where d.id = alert_settings.domain_id and d.user_id = auth.uid())
);
create policy "alert_log_own" on public.alert_log for all using (
  exists (select 1 from public.domains d where d.id = alert_log.domain_id and d.user_id = auth.uid())
);
