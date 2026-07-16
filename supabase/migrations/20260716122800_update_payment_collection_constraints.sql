-- Drop existing constraints
ALTER TABLE "public"."games" DROP CONSTRAINT IF EXISTS "games_payment_collection_type_check";
ALTER TABLE "public"."leagues" DROP CONSTRAINT IF EXISTS "leagues_payment_collection_type_check";

-- Add updated constraints that allow 'player_fees'
ALTER TABLE "public"."games" 
  ADD CONSTRAINT "games_payment_collection_type_check" 
  CHECK (("payment_collection_type" = ANY (ARRAY['stripe'::text, 'cash'::text, 'player_fees'::text])));

ALTER TABLE "public"."leagues" 
  ADD CONSTRAINT "leagues_payment_collection_type_check" 
  CHECK (("payment_collection_type" = ANY (ARRAY['stripe'::text, 'cash'::text, 'player_fees'::text])));
