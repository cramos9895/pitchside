-- Migration to add location_name and game_format to games table
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS game_format TEXT;
