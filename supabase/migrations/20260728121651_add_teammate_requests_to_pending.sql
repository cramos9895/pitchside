-- Add optional teammate request columns to pending_checkouts table
ALTER TABLE public.pending_checkouts
ADD COLUMN requested_teammate_ids UUID[] DEFAULT NULL,
ADD COLUMN requested_team_id UUID DEFAULT NULL,
ADD COLUMN requested_team_name TEXT DEFAULT NULL;
