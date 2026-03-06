-- Add Stripe Payment Intent ID to resource_bookings to enable native refunds

ALTER TABLE public.resource_bookings 
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
