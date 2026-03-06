-- Phase 35: The Pickup Squad Selector Migration
-- Adds team_assignment strictly for tracking which roster a B2C pickup player selected.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS team_assignment INTEGER;

COMMENT ON COLUMN public.bookings.team_assignment IS 'Stores the explicitly selected UI Squad Block integer (1 = Team 1) to build formal rosters during B2C Games.';
