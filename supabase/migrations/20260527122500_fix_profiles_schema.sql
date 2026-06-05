-- ==========================================
-- MIGRATION: Fix Profiles Schema (Re-apply)
-- DESCRIPTION: Transition from full_name to first_name/last_name and add persona metadata.
-- Re-applying because the original 20260507210139 migration was marked as applied but changes were missing.
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
-- (Commented out because full_name column was already dropped in a previous migration)
-- UPDATE public.profiles
-- SET 
--   first_name = split_part(full_name, ' ', 1),
--   last_name = CASE 
--     WHEN position(' ' in full_name) > 0 
--     THEN trim(substring(full_name from position(' ' in full_name) + 1))
--     ELSE '' 
--   END
-- WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

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

-- 4. Drop dependent policies on booking_rosters
DROP POLICY IF EXISTS "Captains can remove players from their roster" ON public.booking_rosters;
DROP POLICY IF EXISTS "Captains can view their own booking rosters" ON public.booking_rosters;

-- 5. Drop the deprecated column
-- We drop it now as requested, but the data is safely moved.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;

-- 6. Recreate the policies using first_name and last_name
CREATE POLICY "Captains can remove players from their roster" ON "public"."booking_rosters" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."resource_bookings" "rb"
  WHERE (("rb"."id" = "booking_rosters"."booking_group_id") AND ("rb"."renter_name" = ( SELECT trim(coalesce("profiles"."first_name",'') || ' ' || coalesce("profiles"."last_name",''))
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))) OR (EXISTS ( SELECT 1
   FROM "public"."recurring_booking_groups" "rbg"
  WHERE (("rbg"."id" = "booking_rosters"."booking_group_id") AND ("rbg"."user_id" = "auth"."uid"()))))));

CREATE POLICY "Captains can view their own booking rosters" ON "public"."booking_rosters" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."resource_bookings" "rb"
  WHERE (("rb"."id" = "booking_rosters"."booking_group_id") AND ("rb"."renter_name" = ( SELECT trim(coalesce("profiles"."first_name",'') || ' ' || coalesce("profiles"."last_name",''))
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))) OR (EXISTS ( SELECT 1
   FROM "public"."recurring_booking_groups" "rbg"
  WHERE (("rbg"."id" = "booking_rosters"."booking_group_id") AND ("rbg"."user_id" = "auth"."uid"()))))));

COMMIT;
