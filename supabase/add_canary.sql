-- Ransomware canary deployments
CREATE TABLE IF NOT EXISTS public.canary_deployments (
  id           uuid primary key default gen_random_uuid(),
  canary_id    text not null unique,
  domain_id    uuid references public.domains(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  platform     text,
  hostname     text,
  deployed_at  timestamptz not null default now()
);

-- Canary alert events
CREATE TABLE IF NOT EXISTS public.canary_alerts (
  id           uuid primary key default gen_random_uuid(),
  canary_id    text not null,
  org_name     text,
  event_type   text not null,
  file_path    text,
  hostname     text,
  username     text,
  platform     text,
  triggered_at timestamptz not null default now()
);

ALTER TABLE public.canary_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canary_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canary_deployments_own" ON public.canary_deployments;
DROP POLICY IF EXISTS "canary_alerts_own" ON public.canary_alerts;

CREATE POLICY "canary_deployments_own" ON public.canary_deployments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "canary_alerts_own" ON public.canary_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.canary_deployments d WHERE d.canary_id = canary_alerts.canary_id AND d.user_id = auth.uid())
);
