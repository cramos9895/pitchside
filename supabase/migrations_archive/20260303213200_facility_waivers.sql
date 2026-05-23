-- Add waiver_text to facilities
ALTER TABLE public.facilities
ADD COLUMN IF NOT EXISTS waiver_text text;
