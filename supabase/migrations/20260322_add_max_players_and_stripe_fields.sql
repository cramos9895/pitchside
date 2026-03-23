-- Add max_players_per_team to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS max_players_per_team integer;

-- Add stripe_setup_intent_id and payment_status to tournament_registrations
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS stripe_setup_intent_id text;
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
mode:AGENT_MODE_EXECUTION
