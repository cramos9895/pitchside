-- Function to update current_players count
CREATE OR REPLACE FUNCTION update_current_players_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Determine the game_id from NEW or OLD record
    DECLARE
        target_game_id UUID;
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            target_game_id := OLD.game_id;
        ELSE
            target_game_id := NEW.game_id;
        END IF;

        -- Update the games table with the count of 'paid' bookings
        UPDATE games
        SET current_players = (
            SELECT COUNT(*)
            FROM bookings
            WHERE game_id = target_game_id
            AND status = 'paid'
        )
        WHERE id = target_game_id;

        -- If it's an UPDATE and game_id changed (unlikely but possible), update the old game too
        IF (TG_OP = 'UPDATE' AND OLD.game_id IS DISTINCT FROM NEW.game_id) THEN
            UPDATE games
            SET current_players = (
                SELECT COUNT(*)
                FROM bookings
                WHERE game_id = OLD.game_id
                AND status = 'paid'
            )
            WHERE id = OLD.game_id;
        END IF;

        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
DROP TRIGGER IF EXISTS trg_update_player_count ON bookings;

CREATE TRIGGER trg_update_player_count
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_current_players_count();

-- Recalculate counts for all existing games
UPDATE games g
SET current_players = (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.game_id = g.id
    AND b.status = 'paid'
);
