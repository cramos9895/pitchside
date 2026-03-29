-- Migration: Add 'role' column to tournament_registrations
-- Description: This column distinguishes between 'captain' and 'player' (free agent) roles.

ALTER TABLE tournament_registrations 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'player';

-- Update existing records if necessary (optional, but good for data integrity)
-- UPDATE tournament_registrations SET role = 'captain' WHERE team_id IS NOT NULL;
-- UPDATE tournament_registrations SET role = 'player' WHERE team_id IS NULL;
