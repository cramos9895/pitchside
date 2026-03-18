-- Run this in your Supabase SQL Editor
-- This adds the columns required for the Multi-Week League functionality:
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS earliest_game_start_time time,
ADD COLUMN IF NOT EXISTS latest_game_start_time time,
ADD COLUMN IF NOT EXISTS field_names text[],
ADD COLUMN IF NOT EXISTS min_games_guaranteed integer,
ADD COLUMN IF NOT EXISTS teams_into_playoffs integer,
ADD COLUMN IF NOT EXISTS has_playoff_bye boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS break_between_games integer;

-- Notify the API to reload the schema cache so changes take effect immediately
NOTIFY pgrst, 'reload schema';
