-- Add Stripe Vaulting capability to profiles
ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;

-- Add payment instrument traceability to bookings to charge free agents after draft
ALTER TABLE public.bookings ADD COLUMN stripe_payment_method_id TEXT;

-- Add Refund Policy flag to games
ALTER TABLE public.games ADD COLUMN is_refundable BOOLEAN DEFAULT false;
