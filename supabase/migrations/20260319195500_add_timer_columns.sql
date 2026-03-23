-- Migration to add timer columns to matches table
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS timer_status TEXT DEFAULT 'stopped' CHECK (timer_status IN ('stopped', 'running', 'paused')),
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paused_elapsed_seconds INTEGER DEFAULT 0;
