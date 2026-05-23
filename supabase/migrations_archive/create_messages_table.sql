
-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Select messages (Participants & Admins)
CREATE POLICY "Select messages policy" ON messages
FOR SELECT
USING (
    -- User is a participant
    EXISTS (
        SELECT 1 FROM bookings
        WHERE bookings.game_id = messages.event_id
        AND bookings.user_id = auth.uid()
        AND bookings.status IN ('active', 'paid', 'waitlist') -- Should waitlist see chat? User said "participants". Assuming active/paid/waitlist are all relevant.
    )
    OR
    -- User is an admin
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'master_admin')
    )
);

-- Policy: Insert messages (Participants & Admins)
CREATE POLICY "Insert messages policy" ON messages
FOR INSERT
WITH CHECK (
    -- User is a participant (Active/Paid only)
    EXISTS (
        SELECT 1 FROM bookings
        WHERE bookings.game_id = messages.event_id
        AND bookings.user_id = auth.uid()
        AND bookings.status IN ('active', 'paid')
    )
    OR
    -- User is an admin
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'master_admin')
    )
);

-- Realtime is enabled manually by user as per instructions.
