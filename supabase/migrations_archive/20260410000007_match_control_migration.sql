-- Phase-Based Match Management & Tournament Timer Architecture
-- This migration adds game phase tracking and period lengths for Micro-Tournaments.
-- Strictly isolated to the public.matches and public.games tables.

-- 1. Add match_phase to matches
-- Existing standard matches will default to 'pre_game' and remain backward compatible.
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS match_phase text 
CHECK (match_phase IN ('pre_game', 'first_half', 'halftime', 'second_half', 'post_game')) 
DEFAULT 'pre_game';

-- 2. Ensure game period lengths exist on the games table
-- These allow for dynamic countdown math (e.g. 25 min halves, 5 min halftime).
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS half_length integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS halftime_length integer DEFAULT 5;

-- 3. Add simple column comments for clarity
COMMENT ON COLUMN public.matches.match_phase IS 'The specific phase of a live tournament match used for countdown logic.';
COMMENT ON COLUMN public.games.half_length IS 'The duration of a single half in minutes.';
COMMENT ON COLUMN public.games.halftime_length IS 'The duration of the halftime break in minutes.';
