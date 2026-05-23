-- Add checked_in column to tournament_registrations
ALTER TABLE tournament_registrations 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false;
