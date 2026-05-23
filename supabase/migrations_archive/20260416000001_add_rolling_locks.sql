-- Migration: Rolling League Registration Locks
ALTER TABLE games 
  ADD COLUMN IF NOT EXISTS accepting_registrations BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_cutoff TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS roster_lock_date TIMESTAMP WITH TIME ZONE;
