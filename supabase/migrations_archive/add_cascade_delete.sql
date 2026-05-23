-- Add ON DELETE CASCADE to bookings
ALTER TABLE bookings
DROP CONSTRAINT bookings_game_id_fkey,
ADD CONSTRAINT bookings_game_id_fkey
    FOREIGN KEY (game_id)
    REFERENCES games(id)
    ON DELETE CASCADE;

-- Add ON DELETE CASCADE to matches
-- (Assuming matches table exists and has game_id fk)
ALTER TABLE matches
DROP CONSTRAINT matches_game_id_fkey,
ADD CONSTRAINT matches_game_id_fkey
    FOREIGN KEY (game_id)
    REFERENCES games(id)
    ON DELETE CASCADE;
