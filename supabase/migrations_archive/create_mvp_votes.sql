-- Create mvp_votes table
CREATE TABLE mvp_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    candidate_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: A voter can only vote once per game
ALTER TABLE mvp_votes ADD CONSTRAINT unique_vote_per_game UNIQUE (game_id, voter_id);

-- Enable RLS
ALTER TABLE mvp_votes ENABLE ROW LEVEL SECURITY;

-- Policy: INSERT (Participants only)
CREATE POLICY "Enable insert for participants" ON mvp_votes
FOR INSERT
WITH CHECK (
    -- Voter must be the authenticated user
    auth.uid() = voter_id
    AND
    -- Voter must be a participant in the game
    EXISTS (
        SELECT 1 FROM bookings
        WHERE bookings.game_id = mvp_votes.game_id
        AND bookings.user_id = auth.uid()
        AND bookings.status IN ('active', 'paid')
    )
);

-- Policy: SELECT (Voter themselves OR Admins)
-- We allow admins to see all votes for the tally.
-- We allow voters to see their own vote (UI feedback).
CREATE POLICY "Enable select for voters and admins" ON mvp_votes
FOR SELECT
USING (
    auth.uid() = voter_id
    OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'master_admin')
    )
);

-- Enable Realtime for Live Tally
ALTER PUBLICATION supabase_realtime ADD TABLE mvp_votes;
