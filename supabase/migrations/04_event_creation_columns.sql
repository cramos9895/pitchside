-- Run this in your Supabase SQL Editor
-- This adds the new columns requested for the Event Creation Page
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS rules_description text,
ADD COLUMN IF NOT EXISTS location_nickname text,
ADD COLUMN IF NOT EXISTS game_format_type text,
ADD COLUMN IF NOT EXISTS match_style text,
ADD COLUMN IF NOT EXISTS refund_cutoff_hours integer,
ADD COLUMN IF NOT EXISTS field_size text,
ADD COLUMN IF NOT EXISTS shoe_types text[];

-- The following columns already existed in your codebase but were missing from the DB schema
-- Adding them here so the "Micro-Tournament" and "Multi-Week League" tabs don't crash the form
ALTER TABLE games
ADD COLUMN IF NOT EXISTS amount_of_fields integer,
ADD COLUMN IF NOT EXISTS min_teams integer,
ADD COLUMN IF NOT EXISTS max_teams integer,
ADD COLUMN IF NOT EXISTS team_price numeric,
ADD COLUMN IF NOT EXISTS free_agent_price numeric,
ADD COLUMN IF NOT EXISTS total_weeks integer,
ADD COLUMN IF NOT EXISTS is_playoff_included boolean,
ADD COLUMN IF NOT EXISTS team_roster_fee numeric,
ADD COLUMN IF NOT EXISTS deposit_amount numeric,
ADD COLUMN IF NOT EXISTS min_players_per_team integer,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS reward text,
ADD COLUMN IF NOT EXISTS prize_type text,
ADD COLUMN IF NOT EXISTS fixed_prize_amount numeric,
ADD COLUMN IF NOT EXISTS prize_pool_percentage numeric,
ADD COLUMN IF NOT EXISTS refund_cutoff_date timestamptz,
ADD COLUMN IF NOT EXISTS roster_lock_date timestamptz,
ADD COLUMN IF NOT EXISTS strict_waiver_required boolean,
ADD COLUMN IF NOT EXISTS mercy_rule_cap integer,
ADD COLUMN IF NOT EXISTS is_league boolean;

-- Notify the API to reload the schema cache so changes take effect immediately
NOTIFY pgrst, 'reload schema';
