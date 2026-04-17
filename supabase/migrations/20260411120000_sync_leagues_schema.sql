-- Sync leagues table with games table for financial and waiver support
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS payment_collection_type text DEFAULT 'stripe' CHECK (payment_collection_type IN ('stripe', 'cash')),
ADD COLUMN IF NOT EXISTS cash_fee_structure text,
ADD COLUMN IF NOT EXISTS cash_amount numeric,
ADD COLUMN IF NOT EXISTS strict_waiver_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS waiver_details text,
ADD COLUMN IF NOT EXISTS player_registration_fee numeric;

-- Comment for clarity
COMMENT ON COLUMN leagues.payment_collection_type IS 'Method of payment collection: stripe (online) or cash (at the field).';
COMMENT ON COLUMN leagues.strict_waiver_required IS 'If true, users must explicitly accept the waiver text before registering.';
