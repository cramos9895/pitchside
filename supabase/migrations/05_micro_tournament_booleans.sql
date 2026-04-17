-- Run this in your Supabase SQL Editor
-- This adds the two missing boolean columns needed for the Micro-Tournament config:
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS has_registration_fee_credit boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_free_agent_credit boolean DEFAULT false;

-- Notify the API to reload the schema cache so changes take effect immediately
NOTIFY pgrst, 'reload schema';
