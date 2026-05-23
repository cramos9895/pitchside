-- Create match_players for match-specific attendance
CREATE TABLE IF NOT EXISTS public.match_players (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_checked_in BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(match_id, user_id)
);

-- Enable RLS
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- Policies for match_players
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Match players are viewable by everyone') THEN
        CREATE POLICY "Match players are viewable by everyone" ON public.match_players FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage match players') THEN
        CREATE POLICY "Admins can manage match players" ON public.match_players FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
