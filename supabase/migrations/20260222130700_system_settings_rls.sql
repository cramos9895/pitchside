-- Add UPDATE and INSERT RLS policies for system_settings

DROP POLICY IF EXISTS "Allow update access to admins" ON public.system_settings;
DROP POLICY IF EXISTS "Allow update access to master_admin" ON public.system_settings;
DROP POLICY IF EXISTS "Allow insert access to master_admin" ON public.system_settings;
DROP POLICY IF EXISTS "Allow all access to master_admin and super_admin" ON public.system_settings;

CREATE POLICY "Allow all access to master_admin and super_admin" ON public.system_settings
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master_admin' OR
  (SELECT system_role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master_admin' OR
  (SELECT system_role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);
