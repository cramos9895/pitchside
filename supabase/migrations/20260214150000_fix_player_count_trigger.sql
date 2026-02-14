-- Function to update current_players count (Fix: include 'active' status)
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

        -- Update the games table with the count of 'paid' OR 'active' bookings
        UPDATE games
        SET current_players = (
            SELECT COUNT(*)
            FROM bookings
            WHERE game_id = target_game_id
            AND status IN ('paid', 'active')
        )
        WHERE id = target_game_id;

        -- If it's an UPDATE and game_id changed (unlikely but possible), update the old game too
        IF (TG_OP = 'UPDATE' AND OLD.game_id IS DISTINCT FROM NEW.game_id) THEN
            UPDATE games
            SET current_players = (
                SELECT COUNT(*)
                FROM bookings
                WHERE game_id = OLD.game_id
                AND status IN ('paid', 'active')
            )
            WHERE id = OLD.game_id;
        END IF;

        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- Trigger is already there (or we can recreate it to be safe)
-- But mostly we just updated the function.

-- Recalculate counts for all existing games to fix inconsistencies
UPDATE games g
SET current_players = (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.game_id = g.id
    AND b.status IN ('paid', 'active')
);
