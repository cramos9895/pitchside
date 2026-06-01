ALTER TABLE games ADD COLUMN IF NOT EXISTS requires_officials BOOLEAN DEFAULT false;

-- Backfill existing games so they don't break existing logic
UPDATE games SET requires_officials = false WHERE requires_officials IS NULL;
