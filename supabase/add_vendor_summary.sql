-- Add summary column to vendors table
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS summary jsonb default '[]'::jsonb;
