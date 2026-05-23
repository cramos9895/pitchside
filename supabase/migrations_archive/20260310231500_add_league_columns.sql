-- Add League Engine properties to games table
ALTER TABLE games 
ADD COLUMN is_league BOOLEAN DEFAULT false,
ADD COLUMN total_weeks INTEGER,
ADD COLUMN is_playoff_included BOOLEAN DEFAULT false,
ADD COLUMN team_roster_fee NUMERIC DEFAULT 0,
ADD COLUMN deposit_amount NUMERIC DEFAULT 0,
ADD COLUMN min_players_per_team INTEGER DEFAULT 0;

-- Add split payment properties to bookings table
ALTER TABLE bookings
ADD COLUMN custom_invite_fee NUMERIC,
ADD COLUMN stripe_payment_method_id TEXT;
