-- 1. Drop the existing UPDATE-only policy for site_content
DROP POLICY IF EXISTS "Admins can update site content" ON public.site_content;

-- 2. Create a unified ALL policy for admins to allow INSERT, UPDATE, DELETE 
-- (This ensures upsert commands work without failing on the INSERT check)
CREATE POLICY "Admins can manage site content"
ON public.site_content
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'master_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'master_admin')
  )
);

-- 3. Just in case, grant necessary permissions to authenticated users
GRANT ALL ON public.site_content TO authenticated;
