-- Migration: Clean up ghost teams from failed payment sessions
-- These are teams created with 'pending' status that never had payment confirmed.
-- Timestamp: 20260716230800

-- Step 1: Delete tournament_registrations that are 'pending' and older than 2 hours.
-- These are the "ghost" registrations from failed payment flows.
-- The cascade on teams(id) will automatically delete the associated team
-- if no other active registrations reference it.
DELETE FROM tournament_registrations
WHERE status = 'pending'
  AND created_at < (NOW() - INTERVAL '2 hours');

-- Step 2: Clean up any orphaned teams (teams with no associated registration at all).
-- This catches edge cases where a team was created but the registration insert failed.
DELETE FROM teams
WHERE id NOT IN (
    SELECT DISTINCT team_id 
    FROM tournament_registrations 
    WHERE team_id IS NOT NULL
)
AND game_id IS NOT NULL;
