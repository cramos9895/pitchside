-- Migration: Allow Captains to draft Free Agents
-- Description: This policy allows users with the 'captain' role for a team to update registrations, enabling them to draft free agents into their team.

-- 1. Drop existing update policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Captains can draft free agents" ON public.tournament_registrations;

-- 2. Create the new policy
CREATE POLICY "Captains can draft free agents"
  ON public.tournament_registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_registrations tr_captain
      WHERE tr_captain.user_id = auth.uid()
      AND tr_captain.team_id = tournament_registrations.team_id -- they are part of the target team
      AND tr_captain.role = 'captain'
    )
    OR (user_id = auth.uid()) -- users can still manage their own
  )
  WITH CHECK (
    -- Ensure the captain is only drafting INTO their own team
    EXISTS (
      SELECT 1 FROM public.tournament_registrations tr_captain
      WHERE tr_captain.user_id = auth.uid()
      -- Since the 'team_id' in the CHECK refers to the NEW value being set:
      AND tr_captain.team_id = tournament_registrations.team_id 
      AND tr_captain.role = 'captain'
    )
    OR (user_id = auth.uid()) -- users can still manage their own
  );
