-- Add display fields to leagues table
ALTER TABLE public.leagues 
ADD COLUMN IF NOT EXISTS format TEXT,
ADD COLUMN IF NOT EXISTS match_day TEXT;

-- Update existing leagues with some defaults if any exist
UPDATE public.leagues SET format = '5v5' WHERE format IS NULL;
UPDATE public.leagues SET match_day = 'TBD' WHERE match_day IS NULL;
mode:AGENT_MODE_PLANNING
