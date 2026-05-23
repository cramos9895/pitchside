-- Add 'pending' to tournament_registrations_status_check constraint
ALTER TABLE "public"."tournament_registrations" DROP CONSTRAINT "tournament_registrations_status_check";
ALTER TABLE "public"."tournament_registrations" ADD CONSTRAINT "tournament_registrations_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'registered'::text, 'drafted'::text, 'waitlisted'::text, 'cancelled'::text]));
