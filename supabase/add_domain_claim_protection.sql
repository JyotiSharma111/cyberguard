-- ============================================================
-- CyberGuard — Domain claim protection
-- Prevents two users from verifying the same domain.
-- Run in Supabase SQL Editor
-- ============================================================

-- Remove old per-user unique (allows user A and user B to both add google.com)
ALTER TABLE public.domains DROP CONSTRAINT IF EXISTS domains_user_id_name_key;

-- Unique index only on VERIFIED domains — pending can exist across accounts
-- (while competing users race to verify, only first one wins)
CREATE UNIQUE INDEX IF NOT EXISTS domains_verified_name_unique
  ON public.domains (name)
  WHERE status = 'verified';

-- Trigger function: block insert if domain already verified by someone else
CREATE OR REPLACE FUNCTION public.check_domain_not_claimed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.domains
    WHERE name = NEW.name
      AND status = 'verified'
      AND user_id != NEW.user_id
  ) THEN
    RAISE EXCEPTION 'domain_already_claimed: % is already verified by another account', NEW.name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.domains
    WHERE name = NEW.name
      AND user_id = NEW.user_id
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'domain_already_added: You already added %', NEW.name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_domain_insert ON public.domains;
CREATE TRIGGER before_domain_insert
  BEFORE INSERT ON public.domains
  FOR EACH ROW EXECUTE FUNCTION public.check_domain_not_claimed();
