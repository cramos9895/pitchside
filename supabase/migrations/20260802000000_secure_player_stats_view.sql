-- Recreate the player_stats view with security_invoker = on
-- This ensures the view inherits the RLS policies of the underlying bookings table.

CREATE OR REPLACE VIEW "public"."player_stats" 
WITH (security_invoker = on)
AS
 SELECT "user_id",
    "count"(*) AS "total_games",
    "count"(*) FILTER (WHERE ("is_winner" = true)) AS "total_wins"
   FROM "public"."bookings"
  WHERE (("status" = 'confirmed'::"text") OR ("status" = 'checked_in'::"text"))
  GROUP BY "user_id";
