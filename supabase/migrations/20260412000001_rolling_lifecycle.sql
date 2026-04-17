-- Migration: Rolling League Lifecycle & Attendance
-- Description: Adds boundary conditions and skip-week logic to Rolling Leagues.

-- 1. Update games table
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS lifecycle_status TEXT DEFAULT 'active' CHECK (lifecycle_status IN ('active', 'paused', 'completed')),
ADD COLUMN IF NOT EXISTS lifecycle_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS skipped_dates JSONB DEFAULT '[]'::jsonb;

-- 2. Create game_attendance table for tracking commitments per match_date
CREATE TABLE IF NOT EXISTS public.game_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    match_date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('committed', 'out', 'pending')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(game_id, user_id, match_date)
);

-- 3. RLS for attendance
ALTER TABLE public.game_attendance ENABLE ROW LEVEL SECURITY;

-- Players can view all attendance for their team to see who's coming
CREATE POLICY "Players can view team attendance" ON public.game_attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tournament_registrations
            WHERE tournament_registrations.team_id = game_attendance.team_id
            AND tournament_registrations.user_id = auth.uid()
        )
    );

-- Players can upsert their own attendance
CREATE POLICY "Players can manage own attendance" ON public.game_attendance
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins have full access to attendance" ON public.game_attendance
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'host'
        )
    );
