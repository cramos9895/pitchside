-- Phase 1: Referee Bidding System

-- 1. match_bids table
CREATE TABLE IF NOT EXISTS match_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('Primary', 'Backup')),
    bid_type TEXT NOT NULL CHECK (bid_type IN ('Accept Rate', 'Lower', 'Higher')),
    bid_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (match_id, user_id, role)
);

ALTER TABLE match_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view match bids" 
    ON match_bids FOR SELECT USING (true);

CREATE POLICY "Users can insert their own bids" 
    ON match_bids FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending bids"
    ON match_bids FOR UPDATE USING (auth.uid() = user_id AND status = 'Pending');

CREATE POLICY "Admins have full access to match_bids"
    ON match_bids FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'master_admin'))
    );

-- 2. Modify match_officials
ALTER TABLE match_officials 
ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'Stripe' CHECK (payout_method IN ('Stripe', 'Manual', 'Off-Platform')),
ADD COLUMN IF NOT EXISTS off_platform_name TEXT,
ADD COLUMN IF NOT EXISTS off_platform_email TEXT,
ADD COLUMN IF NOT EXISTS agreed_rate NUMERIC,
ADD COLUMN IF NOT EXISTS confirmed_arrival BOOLEAN DEFAULT false;

-- 3. Modify profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS reliability_rating NUMERIC DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS completed_assignments INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS missed_assignments INT DEFAULT 0;

-- 4. Modify games
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS backup_retainer_amount NUMERIC DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS backup_bonus_amount NUMERIC DEFAULT 15.00;
