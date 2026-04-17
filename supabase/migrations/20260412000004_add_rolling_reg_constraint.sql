-- 🏗️ Architecture: [[RollingRegistrationClient.md]]
-- Add a unique constraint to tournament_registrations to support Rolling League upserts.
-- This ensures a player can only have one registration per match-based Rolling League.
-- Null Safety: The 'WHERE game_id IS NOT NULL' clause ensures this constraint only applies to 
-- Rolling Leagues and does not interfere with Standard Leagues (which use tournament_id).

-- Drop the partial index attempt
DROP INDEX IF EXISTS tournament_registrations_rolling_unique_idx;

-- Add standard unique constraint (Postgres allows multiple NULL game_ids for the same user)
ALTER TABLE tournament_registrations 
ADD CONSTRAINT tournament_registrations_game_user_unique 
UNIQUE (game_id, user_id);
