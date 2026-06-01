-- Update matches table state columns if they don't exist
ALTER TABLE matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_score INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_score INT DEFAULT 0;

-- Ensure defaults on existing columns just in case
ALTER TABLE matches ALTER COLUMN status SET DEFAULT 'scheduled';
ALTER TABLE matches ALTER COLUMN home_score SET DEFAULT 0;
ALTER TABLE matches ALTER COLUMN away_score SET DEFAULT 0;

-- Set existing nulls to 0
UPDATE matches SET home_score = 0 WHERE home_score IS NULL;
UPDATE matches SET away_score = 0 WHERE away_score IS NULL;
UPDATE matches SET status = 'scheduled' WHERE status IS NULL;

-- Create match_events ledger
CREATE TABLE IF NOT EXISTS match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID, -- nullable in case of generic event, or reference to teams
    player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- e.g., 'goal', 'yellow_card', 'red_card'
    minute_mark INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read match events
CREATE POLICY "Anyone can read match events" 
    ON match_events 
    FOR SELECT 
    USING (true);

-- Policy: Only confirmed referees for the match can insert events
CREATE POLICY "Confirmed referees can insert events" 
    ON match_events 
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM match_officials 
            WHERE match_officials.match_id = match_events.match_id 
            AND match_officials.user_id = auth.uid() 
            AND match_officials.status = 'Confirmed'
        )
    );

-- Policy: Only confirmed referees for the match can delete/update events (if needed later)
CREATE POLICY "Confirmed referees can update events" 
    ON match_events 
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 
            FROM match_officials 
            WHERE match_officials.match_id = match_events.match_id 
            AND match_officials.user_id = auth.uid() 
            AND match_officials.status = 'Confirmed'
        )
    );

CREATE POLICY "Confirmed referees can delete events" 
    ON match_events 
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 
            FROM match_officials 
            WHERE match_officials.match_id = match_events.match_id 
            AND match_officials.user_id = auth.uid() 
            AND match_officials.status = 'Confirmed'
        )
    );

-- Also allow admins to manage match events
CREATE POLICY "Admins have full access to match_events"
    ON match_events
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'master_admin')
        )
    );
