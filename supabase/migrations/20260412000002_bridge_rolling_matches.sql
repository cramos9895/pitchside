-- 🏗️ Architecture: [[RollingLeague.md]]
-- Enables traditional standings and concrete scheduling for Rolling Leagues by linking matches to the games table.

-- 1. Add game_id to league_matches
ALTER TABLE public.league_matches 
ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES public.games(id) ON DELETE CASCADE;

-- 2. Update RLS policies for league_matches to account for game_id
-- This allows team members/captains of a Rolling League to see their match results.
DROP POLICY IF EXISTS "League matches are viewable by everyone" ON public.league_matches;
CREATE POLICY "League matches are viewable by everyone"
  ON public.league_matches FOR SELECT
  USING ( true );

-- Ensure facility admins can manage matches for Rolling Leagues too
DROP POLICY IF EXISTS "Facility admins can manage league matches" ON public.league_matches;
CREATE POLICY "Facility admins can manage league matches"
  ON public.league_matches
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues l
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE l.id = league_matches.league_id
      AND (p.system_role = 'super_admin' or p.role = 'master_admin' or (p.system_role = 'facility_admin' and p.facility_id = l.facility_id))
    )
    OR
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.facilities f ON f.id = g.facility_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE g.id = league_matches.game_id
      AND (p.system_role = 'super_admin' or p.role = 'master_admin' or (p.system_role = 'facility_admin' and p.facility_id = f.id))
    )
  );
