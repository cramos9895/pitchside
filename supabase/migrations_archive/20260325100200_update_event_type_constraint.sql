-- Update the event_type check constraint to include 'league'
-- This allows the 'league' value for the event_type column in the games table.

-- First, drop the existing constraint (naming may vary, but standard is games_event_type_check)
ALTER TABLE public.games 
DROP CONSTRAINT IF EXISTS games_event_type_check;

-- Add the new constraint with 'league' included
ALTER TABLE public.games 
ADD CONSTRAINT games_event_type_check 
CHECK (event_type IN ('standard', 'tournament', 'league'));
