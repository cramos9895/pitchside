-- Add Rolling League specialized columns to the games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS league_format text DEFAULT 'structured' CHECK (league_format IN ('structured', 'rolling')),
ADD COLUMN IF NOT EXISTS payment_collection_type text DEFAULT 'stripe' CHECK (payment_collection_type IN ('stripe', 'cash')),
ADD COLUMN IF NOT EXISTS cash_fee_structure text,
ADD COLUMN IF NOT EXISTS cash_amount numeric,
ADD COLUMN IF NOT EXISTS allow_free_agents boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS charge_team_registration_fee boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS team_registration_fee numeric,
ADD COLUMN IF NOT EXISTS deduct_team_reg_fee boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS player_registration_fee numeric,
ADD COLUMN IF NOT EXISTS league_end_date timestamptz,
ADD COLUMN IF NOT EXISTS team_signup_cutoff timestamptz,
ADD COLUMN IF NOT EXISTS waiver_details text;

-- Add comments for documentation
COMMENT ON COLUMN games.league_format IS 'Distinguishes between traditional structured leagues and the new Rolling League format.';
COMMENT ON COLUMN games.payment_collection_type IS 'Method of payment collection for rolling leagues: stripe (online) or cash (at the field).';
COMMENT ON COLUMN games.cash_amount IS 'The amount collected per player/team if payment_collection_type is cash.';

-- Reload schema
NOTIFY pgrst, 'reload schema';
