-- Drop the old constraint (Postgres usually names inline checks as table_column_check)
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;

-- Add the new constraint with 'cancelled' included
ALTER TABLE games ADD CONSTRAINT games_status_check 
  CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled'));
