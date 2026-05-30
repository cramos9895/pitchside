-- Migration: Add structured booking request columns
ALTER TABLE "public"."bookings"
ADD COLUMN "requested_team_id" UUID REFERENCES "public"."teams"("id") ON DELETE SET NULL,
ADD COLUMN "requested_teammate_ids" UUID[] DEFAULT '{}',
ADD COLUMN "requested_team_name" text;
