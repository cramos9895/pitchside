-- Add jersey_number to players
ALTER TABLE team_players ADD COLUMN IF NOT EXISTS jersey_number TEXT;
ALTER TABLE match_players ADD COLUMN IF NOT EXISTS jersey_number TEXT;

-- Add review_status to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending_report' CHECK (review_status IN ('pending_report', 'pending_review', 'approved'));

-- Add incident_note to match_events
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS incident_note TEXT;

-- Create match_reports table
CREATE TABLE IF NOT EXISTS public.match_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conduct_rating INTEGER CHECK (conduct_rating >= 1 AND conduct_rating <= 5),
    facility_notes TEXT,
    match_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.match_reports ENABLE ROW LEVEL SECURITY;

-- Create basic policies for match_reports
CREATE POLICY "Referees can view their own match reports"
    ON public.match_reports FOR SELECT
    USING (auth.uid() = referee_id);

CREATE POLICY "Referees can insert their own match reports"
    ON public.match_reports FOR INSERT
    WITH CHECK (auth.uid() = referee_id);

CREATE POLICY "Admins can view all match reports"
    ON public.match_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
