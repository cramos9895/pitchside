-- Migration: Cash Operations and Playoff Engine
ALTER TABLE tournament_registrations 
  ADD COLUMN IF NOT EXISTS cash_paid_current_round BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_cash_collected INTEGER DEFAULT 0;

ALTER TABLE matches 
  ADD COLUMN IF NOT EXISTS is_playoff BOOLEAN DEFAULT false;
