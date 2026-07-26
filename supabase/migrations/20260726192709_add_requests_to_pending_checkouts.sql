ALTER TABLE "public"."pending_checkouts" 
ADD COLUMN IF NOT EXISTS "requested_teammate_ids" _uuid DEFAULT '{}'::uuid[],
ADD COLUMN IF NOT EXISTS "requested_team_id" uuid,
ADD COLUMN IF NOT EXISTS "requested_team_name" text;
