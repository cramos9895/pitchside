-- Fix platform_reviews RLS policies to match platform admin roles

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.platform_reviews;
DROP POLICY IF EXISTS "Admins have full access to reviews" ON public.platform_reviews;

-- 1. Allow both authenticated and anonymous users to submit reviews 
-- (Optional: Change to authenticated-only if you want to force logins)
CREATE POLICY "Allow anyone to insert reviews"
  ON public.platform_reviews
  FOR INSERT
  WITH CHECK (true);

-- 2. Allow Admins (SuperAdmin, MasterAdmin, Host) to manage all reviews
CREATE POLICY "Admins have full access to reviews"
  ON public.platform_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        system_role = 'super_admin' OR 
        role IN ('master_admin', 'host')
      )
    )
  );
