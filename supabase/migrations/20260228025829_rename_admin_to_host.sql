-- Rename 'admin' to 'host' in existing rows
UPDATE public.profiles
SET role = 'host'
WHERE role = 'admin';

-- The profiles table has a constraint 'valid_role'. Let's drop and recreate it.
-- Based on standard Supabase setups, we need to ensure we drop constraints defensively.
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_role') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT valid_role;
  END IF;
  
  -- Create the new constraint
  ALTER TABLE public.profiles
  ADD CONSTRAINT valid_role
  CHECK (role IN ('player', 'host', 'master_admin'));
END $$;
