-- Add latitude and longitude to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS latitude float8,
ADD COLUMN IF NOT EXISTS longitude float8;
