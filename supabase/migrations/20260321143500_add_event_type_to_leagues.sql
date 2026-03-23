-- Add event_type column to leagues to differentiate between Leagues and Tournaments
ALTER TABLE public.leagues 
ADD COLUMN IF NOT EXISTS event_type text check (event_type in ('league', 'tournament')) default 'league';

-- Update existing records to the default if not set
UPDATE public.leagues
SET event_type = 'league'
WHERE event_type IS NULL;
mode:AGENT_MODE_EXECUTION
