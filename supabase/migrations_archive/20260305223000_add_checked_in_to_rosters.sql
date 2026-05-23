-- Add is_checked_in to booking_rosters for Game Day Operations

ALTER TABLE public.booking_rosters 
    ADD COLUMN IF NOT EXISTS is_checked_in BOOLEAN DEFAULT false;
