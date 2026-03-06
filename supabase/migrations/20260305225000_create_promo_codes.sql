-- Create promo_codes table for Phase 34: The Promotions Engine

CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value INTEGER NOT NULL CHECK (discount_value > 0),
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0 NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE NULLS NOT DISTINCT (facility_id, code) -- Enforce unique codes per facility, and unique global codes
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Policies

-- Master Admins and Super Admins can manage global promo codes
CREATE POLICY "Super and master admins can manage global promo codes"
    ON public.promo_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.system_role = 'super_admin' OR profiles.role = 'master_admin')
        )
    );

-- Facility Admins can manage their own promo codes
CREATE POLICY "Facility admins manage their promo codes"
    ON public.promo_codes
    FOR ALL
    USING (
        facility_id IN (
            SELECT facility_id FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.system_role = 'facility_admin'
            AND facility_id IS NOT NULL
        )
    );

-- Everyone can read promo codes (validation occurs securely on the server side)
CREATE POLICY "Anyone can read active promo codes"
    ON public.promo_codes
    FOR SELECT
    USING (true);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_facility_id ON public.promo_codes(facility_id);
