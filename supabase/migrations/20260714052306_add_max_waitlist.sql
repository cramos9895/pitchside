-- Add max_waitlist column to games table
ALTER TABLE "public"."games" ADD COLUMN "max_waitlist" integer DEFAULT null;
