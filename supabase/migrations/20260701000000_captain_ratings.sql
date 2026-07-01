ALTER TABLE match_officials ADD COLUMN captain_rating integer DEFAULT NULL CHECK (captain_rating >= 1 AND captain_rating <= 5);
