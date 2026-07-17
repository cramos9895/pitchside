-- Add stripe_payment_intent_id to tournament_registrations
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
