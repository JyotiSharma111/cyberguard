-- CyberGuard — Add new scanner columns to scan_results
-- Run in Supabase SQL Editor

alter table public.scan_results
  add column if not exists headers_score  integer default 0,
  add column if not exists dkim_score     integer default 0,
  add column if not exists whois_score    integer default 0,
  add column if not exists threats_score  integer default 0,
  add column if not exists raw_headers    jsonb default '{}'::jsonb,
  add column if not exists raw_dkim       jsonb default '{}'::jsonb,
  add column if not exists raw_whois      jsonb default '{}'::jsonb,
  add column if not exists raw_virustotal jsonb default '{}'::jsonb;

-- Add pentest column
ALTER TABLE public.scan_results
  ADD COLUMN IF NOT EXISTS pentest_score  integer default 0,
  ADD COLUMN IF NOT EXISTS raw_pentest    jsonb default '{}'::jsonb;
