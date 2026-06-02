-- Add jersey_number to match_events
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS jersey_number TEXT;

-- Add jersey_number to tournament_registrations (for Captain Portal)
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS jersey_number TEXT;

-- Add jersey_number to bookings (for pickup games / admin game check-in)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS jersey_number TEXT;
