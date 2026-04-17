-- Add skip_dates array allowing Blackout evasion
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS skip_dates DATE[] DEFAULT '{}';

-- Append relational UUID anchors to matches mapping correctly to generated rounds
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS home_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS away_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
