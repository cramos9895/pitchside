-- Add Micro-League Timeline Columns to games table
-- This migration adds the required fields for Phase 1 of the Micro-League Engine.

ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS roster_lock_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS roster_freeze_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS regular_season_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS playoff_start_date TIMESTAMPTZ;

-- Add comments for clarity in the DB schema
COMMENT ON COLUMN public.games.roster_lock_date IS 'Date when Stripe SetupIntents are captured and initial payments are finalized.';
COMMENT ON COLUMN public.games.roster_freeze_date IS 'Mid-season cutoff date after which Captains/Admins can no longer add/drop players.';
COMMENT ON COLUMN public.games.regular_season_start IS 'Delineates the start of the regular season phase.';
COMMENT ON COLUMN public.games.playoff_start_date IS 'Delineates the start of the playoff phase.';
