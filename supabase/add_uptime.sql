-- Uptime monitoring
CREATE TABLE IF NOT EXISTS public.uptime_checks (
  id          uuid primary key default gen_random_uuid(),
  domain_id   uuid references public.domains(id) on delete cascade not null,
  up          boolean not null,
  status      integer,
  latency_ms  integer,
  error       text,
  checked_at  timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS uptime_checks_domain_idx ON public.uptime_checks(domain_id, checked_at DESC);
ALTER TABLE public.uptime_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uptime_own" ON public.uptime_checks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.domains d WHERE d.id = uptime_checks.domain_id AND d.user_id = auth.uid())
);
