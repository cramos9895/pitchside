-- Function to update current_players count
CREATE OR REPLACE FUNCTION update_current_players_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the game's current_players count based on active/paid bookings
    -- We use the game_id from NEW (for INSERT/UPDATE) or OLD (for DELETE)
    UPDATE games
    SET current_players = (
        SELECT COUNT(*)
        FROM bookings
        WHERE game_id = COALESCE(NEW.game_id, OLD.game_id)
          AND status IN ('active', 'paid')
    )
    WHERE id = COALESCE(NEW.game_id, OLD.game_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run after INSERT, UPDATE, or DELETE on bookings
DROP TRIGGER IF EXISTS on_booking_change ON bookings;

CREATE TRIGGER on_booking_change
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_current_players_count();

-- Backfill existing counts
UPDATE games g
SET current_players = (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.game_id = g.id
      AND b.status IN ('active', 'paid')
);
