-- 1. Drop the existing check constraint
ALTER TABLE "public"."games" DROP CONSTRAINT IF EXISTS "games_event_type_check";

-- 2. Update existing records
UPDATE "public"."games" SET "event_type" = 'pickup' WHERE "event_type" = 'standard';

-- 3. Update the column default
ALTER TABLE "public"."games" ALTER COLUMN "event_type" SET DEFAULT 'pickup';

-- 4. Re-add the check constraint with 'pickup' instead of 'standard'
ALTER TABLE "public"."games" ADD CONSTRAINT "games_event_type_check" 
CHECK (("event_type" = ANY (ARRAY['pickup'::text, 'tournament'::text, 'league'::text])));
