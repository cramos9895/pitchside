-- Repair: Add missing checkout_session_id column to pending_checkouts
-- This column is required for the Stripe checkout flow to persist squad data
ALTER TABLE public.pending_checkouts 
ADD COLUMN IF NOT EXISTS checkout_session_id text UNIQUE;
