-- Migration: Add Timer State to Games Table
-- Adds columns needed for globally synchronized live projectors.

ALTER TABLE public.games
ADD COLUMN timer_status text DEFAULT 'stopped' CHECK (timer_status IN ('stopped', 'running', 'paused')),
ADD COLUMN timer_duration integer DEFAULT 420, -- Default to 7 minutes (420 seconds)
ADD COLUMN timer_started_at timestamp with time zone;

-- Optional: Comment on columns
COMMENT ON COLUMN public.games.timer_status IS 'The current state of the game clock (stopped, running, paused).';
COMMENT ON COLUMN public.games.timer_duration IS 'The total target duration of the current timer in seconds. When stopped, this is the reset value. When paused, this holds the remaining time.';
COMMENT ON COLUMN public.games.timer_started_at IS 'The exact server timestamp when the timer transitioned to running. Used by clients to calculate remaining time dynamically.';
