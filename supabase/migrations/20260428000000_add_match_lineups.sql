-- 🏗️ Architecture: [[match_lineups.md]]
-- Migration: 20260428000000_add_match_lineups.sql
-- Purpose: Store match-specific tactical formations and player positions.

CREATE TABLE IF NOT EXISTS public.match_lineups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    formation TEXT NOT NULL DEFAULT '1-2-1',
    positions JSONB NOT NULL DEFAULT '{}'::jsonb, -- Map of slot_id -> user_id
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, team_id) -- One lineup per team per match
);

-- Enable Row Level Security
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: All authenticated users can view lineups
CREATE POLICY "Lineups are viewable by all authenticated users"
ON public.match_lineups FOR SELECT
TO authenticated
USING (true);

-- 2. ALL Policy: Only the team captain can insert/update/delete their lineup
CREATE POLICY "Captains have full control over their team's lineups"
ON public.match_lineups FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE teams.id = match_lineups.team_id
        AND teams.captain_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE teams.id = match_lineups.team_id
        AND teams.captain_id = auth.uid()
    )
);

-- Automatic updated_at handling
CREATE TRIGGER set_updated_at_lineups
BEFORE UPDATE ON public.match_lineups
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
