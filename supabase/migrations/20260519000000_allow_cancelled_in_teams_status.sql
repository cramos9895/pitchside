-- Add 'cancelled' to teams_status_check constraint
ALTER TABLE "public"."teams" DROP CONSTRAINT IF EXISTS "teams_status_check";
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'waitlisted'::text, 'rejected'::text, 'cancelled'::text]));
