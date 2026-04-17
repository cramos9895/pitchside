-- CLEAR ALL DATA
-- CAUTION: This will delete ALL games, bookings, and matches due to cascading deletes.
DELETE FROM games;

-- Optional: Reset sequence if needed (not needed for UUIDs)
