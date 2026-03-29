-- Migration: Fix Roster Drafting RLS Recursion
-- Description: Replaces the recursive policy with one that checks team ownership/captaincy via a subquery to the registrations table *carefully* or via the teams table if possible.

-- 1. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Captains can draft free agents" ON public.tournament_registrations;

-- 2. Create a non-recursive update policy. 
-- We use a subquery that specifically targets the 'captain' role in a way that should avoid recursion or we use the 'teams' table.
-- However, since 'role' is in tournament_registrations, we MUST reference it.
-- To avoid recursion, we can use a security definer function or a more optimized EXISTS clause.

CREATE OR REPLACE FUNCTION public.is_team_captain(check_team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE user_id = auth.uid()
    AND team_id = check_team_id
    AND role = 'captain'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply the updated policy using the security definer function to break recursion
CREATE POLICY "Captains can draft free agents"
  ON public.tournament_registrations
  FOR UPDATE
  USING (
    public.is_team_captain(team_id)
    OR (user_id = auth.uid())
  )
  WITH CHECK (
    public.is_team_captain(team_id)
    OR (user_id = auth.uid())
  );
