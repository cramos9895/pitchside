-- Add total_game_time column to games table to support Rolling League scheduling
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS total_game_time integer DEFAULT 60;

-- Add comment for documentation
COMMENT ON COLUMN games.total_game_time IS 'Estimated match slot duration in minutes, used by the rolling scheduling engine.';

-- Reload schema
NOTIFY pgrst, 'reload schema';
