-- Migration: Add Stripe SetupIntent and payment status to tournament_registrations
-- Description: Supports deferred split-pay billing for team invites.

ALTER TABLE tournament_registrations 
ADD COLUMN IF NOT EXISTS stripe_setup_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Optional: Index for faster lookups during billing lock
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_setup_intent ON tournament_registrations(stripe_setup_intent_id);
mode:AGENT_MODE_EXECUTION
