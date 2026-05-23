-- ==========================================
-- MIGRATION: Update Profiles Schema
-- DESCRIPTION: Transition from full_name to first_name/last_name and add persona metadata.
-- ==========================================

BEGIN;

-- 1. Add new metadata columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS organization_name text,
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS certification_level text;

-- 2. Backfill first_name and last_name from full_name
-- Safely handles:
-- 'John' -> first: 'John', last: ''
-- 'John Doe' -> first: 'John', last: 'Doe'
-- 'John Van Doe' -> first: 'John', last: 'Van Doe'
UPDATE public.profiles
SET 
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE 
    WHEN position(' ' in full_name) > 0 
    THEN trim(substring(full_name from position(' ' in full_name) + 1))
    ELSE '' 
  END
WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

-- 3. Update the handle_new_user function to map new metadata
-- This trigger runs when a user confirms their email / signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    dob, 
    phone_number, 
    zip_code, 
    organization_name, 
    job_title, 
    certification_level,
    role,
    system_role
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name',
    CASE 
      WHEN new.raw_user_meta_data->>'dob' IS NOT NULL 
      THEN (new.raw_user_meta_data->>'dob')::date 
      ELSE NULL 
    END,
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'zip_code',
    new.raw_user_meta_data->>'organization_name',
    new.raw_user_meta_data->>'job_title',
    new.raw_user_meta_data->>'certification_level',
    COALESCE(new.raw_user_meta_data->>'role', 'player'),
    COALESCE(new.raw_user_meta_data->>'system_role', 'player')
  );
  RETURN new;
END;
$$;

-- 4. Drop the deprecated column
-- We drop it now as requested, but the data is safely moved.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;

COMMIT;
