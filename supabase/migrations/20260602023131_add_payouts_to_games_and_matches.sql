-- Add base_pay and payment_method to games
ALTER TABLE games ADD COLUMN IF NOT EXISTS base_pay NUMERIC;
ALTER TABLE games ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'digital';

-- Add final_payout to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS final_payout NUMERIC;
