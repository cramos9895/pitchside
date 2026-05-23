-- Add allowed_payment_methods to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS allowed_payment_methods text[] DEFAULT ARRAY['venmo', 'zelle'];

-- Update existing games to have default payment methods
UPDATE games
SET allowed_payment_methods = ARRAY['venmo', 'zelle']
WHERE allowed_payment_methods IS NULL;
