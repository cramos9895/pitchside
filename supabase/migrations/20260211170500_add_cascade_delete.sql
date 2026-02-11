-- Add ON DELETE CASCADE to bookings.game_id
ALTER TABLE bookings
DROP CONSTRAINT bookings_game_id_fkey,
ADD CONSTRAINT bookings_game_id_fkey
FOREIGN KEY (game_id)
REFERENCES games(id)
ON DELETE CASCADE;

-- Add ON DELETE CASCADE to matches.game_id (if matches table exists and links to games)
-- Checking schema first would be good, but assuming standard FK naming 'matches_game_id_fkey' or similar.
-- Let's check if matches table exists. If not, this might fail.
-- Safely:
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'matches') THEN
        ALTER TABLE matches
        DROP CONSTRAINT IF EXISTS matches_game_id_fkey,
        ADD CONSTRAINT matches_game_id_fkey
        FOREIGN KEY (game_id)
        REFERENCES games(id)
        ON DELETE CASCADE;
    END IF;
END $$;
