-- Run this in your Supabase SQL Editor
-- This adds the three new columns needed for the Micro-Tournament Game Style logic:
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS game_style varchar DEFAULT 'Group Stage/Playoffs',
ADD COLUMN IF NOT EXISTS half_length integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS halftime_length integer DEFAULT 5;

-- Notify the API to reload the schema cache so changes take effect immediately
NOTIFY pgrst, 'reload schema';
