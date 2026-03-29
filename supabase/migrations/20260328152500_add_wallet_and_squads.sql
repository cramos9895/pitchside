-- Add Pitchside Wallet to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credit_balance integer DEFAULT 0;

-- Add Squad/Group Tracking to Bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS linked_booking_id uuid;

-- Create Pending Checkouts table for Stripe Metadata Bypass
CREATE TABLE IF NOT EXISTS public.pending_checkouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    guest_ids uuid[] DEFAULT array[]::uuid[],
    team_assignment text,
    credit_used integer DEFAULT 0,
    checkout_session_id text UNIQUE NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS for pending_checkouts
ALTER TABLE public.pending_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own pending checkouts"
    ON public.pending_checkouts FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can view their own pending checkouts"
    ON public.pending_checkouts FOR SELECT
    USING (auth.uid() = buyer_id);
