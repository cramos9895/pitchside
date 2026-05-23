-- Add winning team to games table explicitly for stats calculations
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS winning_team_assignment TEXT;
