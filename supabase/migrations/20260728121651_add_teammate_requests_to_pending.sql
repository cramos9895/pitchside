-- Add optional teammate request columns to pending_checkouts table
ALTER TABLE public.pending_checkouts
ADD COLUMN IF NOT EXISTS requested_teammate_ids UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS requested_team_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS requested_team_name TEXT DEFAULT NULL;
