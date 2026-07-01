-- ==========================================
-- MIGRATION: Fix handle_new_user Trigger
-- DESCRIPTION: Ensure empty string dob does not throw invalid input syntax for type date
-- ==========================================

BEGIN;

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
      WHEN new.raw_user_meta_data->>'dob' IS NOT NULL AND new.raw_user_meta_data->>'dob' != ''
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

COMMIT;
