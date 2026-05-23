-- Allow null start_time and end_time for the games table
-- This supports Phase 1 of the Micro-League Engine where single-match times are optional.

ALTER TABLE public.games 
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;
