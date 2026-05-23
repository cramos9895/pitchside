-- 🏗️ Architecture: [[GameCard.md]]
-- Synchronize tournament_registrations with games.current_players count

-- 1. Function to update tournament players count
CREATE OR REPLACE FUNCTION update_tournament_players_count()
RETURNS TRIGGER AS $$
BEGIN
    DECLARE
        target_game_id UUID;
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            target_game_id := OLD.game_id;
        ELSE
            target_game_id := NEW.game_id;
        END IF;

        -- We only update if target_game_id is present (some registrations might be league-only, but we mostly care about game-linked ones for counts)
        IF target_game_id IS NOT NULL THEN
            UPDATE games
            SET current_players = (
                SELECT COUNT(*)
                FROM tournament_registrations
                WHERE game_id = target_game_id
                AND status IN ('registered', 'active', 'paid')
            )
            WHERE id = target_game_id;
        END IF;

        -- Handle game_id changes (re-parenting)
        IF (TG_OP = 'UPDATE' AND OLD.game_id IS DISTINCT FROM NEW.game_id AND OLD.game_id IS NOT NULL) THEN
            UPDATE games
            SET current_players = (
                SELECT COUNT(*)
                FROM tournament_registrations
                WHERE game_id = OLD.game_id
                AND status IN ('registered', 'active', 'paid')
            )
            WHERE id = OLD.game_id;
        END IF;

        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger for tournament_registrations
DROP TRIGGER IF EXISTS tr_update_tournament_players_count ON tournament_registrations;
CREATE TRIGGER tr_update_tournament_players_count
AFTER INSERT OR UPDATE OR DELETE ON tournament_registrations
FOR EACH ROW EXECUTE FUNCTION update_tournament_players_count();

-- 3. Harden Existing bookings Trigger to include 'confirmed'
CREATE OR REPLACE FUNCTION update_current_players_count()
RETURNS TRIGGER AS $$
BEGIN
    DECLARE
        target_game_id UUID;
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            target_game_id := OLD.game_id;
        ELSE
            target_game_id := NEW.game_id;
        END IF;

        UPDATE games
        SET current_players = (
            SELECT COUNT(*)
            FROM bookings
            WHERE game_id = target_game_id
            AND status IN ('paid', 'active', 'confirmed')
        )
        WHERE id = target_game_id;

        IF (TG_OP = 'UPDATE' AND OLD.game_id IS DISTINCT FROM NEW.game_id) THEN
            UPDATE games
            SET current_players = (
                SELECT COUNT(*)
                FROM bookings
                WHERE game_id = OLD.game_id
                AND status IN ('paid', 'active', 'confirmed')
            )
            WHERE id = OLD.game_id;
        END IF;

        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- 4. Initial Sync for ALL event types to clean up inconsistencies
-- Handle Leagues/Tournaments
UPDATE games g
SET current_players = (
    SELECT COUNT(*)
    FROM tournament_registrations tr
    WHERE tr.game_id = g.id
    AND tr.status IN ('registered', 'active', 'paid')
)
WHERE event_type IN ('league', 'tournament');

-- Handle Standard Pickup
UPDATE games g
SET current_players = (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.game_id = g.id
    AND b.status IN ('paid', 'active', 'confirmed')
)
WHERE event_type = 'pickup' OR event_type IS NULL;
