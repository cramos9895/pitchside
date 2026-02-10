-- Fix RLS for matches table (allow master_admin and admin)
-- First, ensure matches table has RLS enabled (it should, but just in case)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
-- We assume 'matches' table exists based on user error. If not, this might fail, but let's try to update policies for it if it does.
-- Actually, the user error said "table 'matches'", so it exists.

-- Policy function to check if user is admin or master_admin
CREATE OR REPLACE FUNCTION is_admin_or_master()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'master_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GAMES Policies (Update to allow master_admin)
CREATE POLICY "Admins and Master Admins can insert games"
ON games FOR INSERT
WITH CHECK ( is_admin_or_master() );

CREATE POLICY "Admins and Master Admins can update games"
ON games FOR UPDATE
USING ( is_admin_or_master() );

CREATE POLICY "Admins and Master Admins can delete games"
ON games FOR DELETE
USING ( is_admin_or_master() );


-- MATCHES Policies (Fixing the reported error)
-- We need to check if matches table exists. If it was created in a file I missed, I'll assume standard naming.
-- CAUTION: If "matches" table name is different (e.g. "match"), this will fail. User said "matches".

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view matches" ON matches;
CREATE POLICY "Public can view matches"
ON matches FOR SELECT
USING ( true );

DROP POLICY IF EXISTS "Admins can insert matches" ON matches;
CREATE POLICY "Admins and Master Admins can insert matches"
ON matches FOR INSERT
WITH CHECK ( is_admin_or_master() );

DROP POLICY IF EXISTS "Admins can update matches" ON matches;
CREATE POLICY "Admins and Master Admins can update matches"
ON matches FOR UPDATE
USING ( is_admin_or_master() );

DROP POLICY IF EXISTS "Admins can delete matches" ON matches;
CREATE POLICY "Admins and Master Admins can delete matches"
ON matches FOR DELETE
USING ( is_admin_or_master() );

-- BOOKINGS Policies (Ensure Waitlist is allowed)
-- Existing policy "Users can create their own bookings." check (auth.uid() = user_id) is sufficient for INSERT.
-- But let's ensuring admins can VIEW all bookings (for Roster page)
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins and Master Admins can view all bookings"
ON bookings FOR SELECT
USING ( is_admin_or_master() );

-- Allow admins to UPDATE bookings (e.g. Promote from waitlist)
DROP POLICY IF EXISTS "Admins can update bookings" ON bookings;
CREATE POLICY "Admins and Master Admins can update bookings"
ON bookings FOR UPDATE
USING ( is_admin_or_master() );
