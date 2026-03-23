-- Fix missing match fields for tournament operations
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS field_name TEXT,
ADD COLUMN IF NOT EXISTS is_playoff BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS match_style TEXT DEFAULT 'tournament',
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE;

-- Fix missing booking fields for tournament management
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_signed BOOLEAN DEFAULT false;
