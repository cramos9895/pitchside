-- Enable RLS on games table
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Games are viewable by everyone" ON games;
CREATE POLICY "Games are viewable by everyone"
  ON games FOR SELECT
  USING ( true );

-- Allow authenticated users (admins) to update games
DROP POLICY IF EXISTS "Authenticated users can update games" ON games;
CREATE POLICY "Authenticated users can update games"
  ON games FOR UPDATE
  USING ( auth.role() = 'authenticated' )
  WITH CHECK ( auth.role() = 'authenticated' );

-- Allow authenticated users to insert games
DROP POLICY IF EXISTS "Authenticated users can insert games" ON games;
CREATE POLICY "Authenticated users can insert games"
  ON games FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' );
