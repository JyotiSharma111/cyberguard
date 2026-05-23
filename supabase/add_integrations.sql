-- CyberGuard — Cloud integrations table
-- Stores encrypted credentials for M365 and AWS
-- Supabase encrypts all data at rest by default

CREATE TABLE IF NOT EXISTS public.integrations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  domain_id    uuid references public.domains(id) on delete cascade,
  type         text not null,  -- 'm365' | 'aws' | 'gcp'
  config       jsonb not null default '{}'::jsonb,  -- encrypted credentials
  last_scanned timestamptz,
  last_score   integer,
  last_issues  jsonb default '[]'::jsonb,
  raw_result   jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(user_id, type)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_own" ON public.integrations
  FOR ALL USING (auth.uid() = user_id);

-- Phishing simulation campaigns
CREATE TABLE IF NOT EXISTS public.phishing_campaigns (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  domain_id    uuid references public.domains(id) on delete cascade,
  name         text not null,
  template_id  text not null,
  from_name    text,
  from_email   text,
  status       text default 'draft',  -- draft|running|complete
  sent_count   integer default 0,
  open_count   integer default 0,
  click_count  integer default 0,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.phishing_recipients (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid references public.phishing_campaigns(id) on delete cascade not null,
  email        text not null,
  name         text,
  sent_at      timestamptz,
  opened_at    timestamptz,
  clicked_at   timestamptz
);

CREATE TABLE IF NOT EXISTS public.phishing_results (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null,
  recipient_id uuid,
  event        text not null,  -- open|click
  event_at     timestamptz not null default now()
);

-- Self-assessment questionnaire responses
CREATE TABLE IF NOT EXISTS public.assessments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  domain_id    uuid references public.domains(id) on delete cascade,
  answers      jsonb not null default '{}'::jsonb,
  score        integer,
  completed_at timestamptz not null default now()
);

ALTER TABLE public.phishing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phishing_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phishing_campaigns_own" ON public.phishing_campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "phishing_recipients_own" ON public.phishing_recipients FOR ALL USING (
  EXISTS (SELECT 1 FROM public.phishing_campaigns c WHERE c.id = phishing_recipients.campaign_id AND c.user_id = auth.uid())
);
CREATE POLICY "assessments_own" ON public.assessments FOR ALL USING (auth.uid() = user_id);
