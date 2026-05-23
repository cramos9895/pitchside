-- Migration for Phase 22: Rate Cards & Stripe Connect
-- Adding financial tracking and Stripe integration fields to the database

-- 1. Facility Payout Configuration
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS charges_enabled BOOLEAN DEFAULT FALSE;

-- 2. Resource Rate Cards
-- Prices are stored in CENTS (e.g., $150.00 = 15000) to avoid floating point math errors
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS default_hourly_rate INTEGER DEFAULT 0;

-- 3. Booking Transactions
-- Track the payment state and link to the Stripe Checkout session
ALTER TABLE public.resource_bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.resource_bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- No new tables are required, just extending existing schemas for the public checkout flow.
