-- Create a secure function to check if the current user is a master_admin
-- We use SECURITY DEFINER to bypass RLS during the check to avoid infinite recursion
CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'master_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add policy to allow Master Admins to update any profile
CREATE POLICY "Master Admins can update any profile"
  ON profiles FOR UPDATE
  USING ( is_master_admin() );
