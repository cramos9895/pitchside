-- Migration: Add verification_photo_url to tournament_registrations
-- Description: Stores a per-tournament headshot for player verification.

ALTER TABLE public.tournament_registrations 
ADD COLUMN IF NOT EXISTS verification_photo_url TEXT;

-- Index for potential lookups
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_vphoto ON public.tournament_registrations(verification_photo_url);
