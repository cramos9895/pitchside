-- ==========================================
-- MIGRATION: Add referee to profiles role checks
-- DESCRIPTION: Drops existing role check constraints and adds them back with 'referee'
-- ==========================================

BEGIN;

ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS "profiles_role_check",
  DROP CONSTRAINT IF EXISTS "valid_role";

ALTER TABLE public.profiles
  ADD CONSTRAINT "profiles_role_check" CHECK (role = ANY (ARRAY['player'::text, 'admin'::text, 'master_admin'::text, 'referee'::text])),
  ADD CONSTRAINT "valid_role" CHECK (role = ANY (ARRAY['player'::text, 'host'::text, 'master_admin'::text, 'referee'::text]));

COMMIT;
