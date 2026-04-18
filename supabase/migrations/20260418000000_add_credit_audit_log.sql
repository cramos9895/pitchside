-- 🏗️ Architecture: [[Overall Database & API.md]]
-- Add Credit Audit Log and Role Elevation OTP storage

-- 1. credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    admin_id uuid NOT NULL REFERENCES public.profiles(id),
    amount integer NOT NULL, -- positive for add, negative for deduct (or use type)
    type text NOT NULL CHECK (type IN ('add', 'deduct', 'spend', 'refund')),
    reason text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. otp_verifications table for Secure Role Elevation
CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_role text NOT NULL,
    code text NOT NULL, -- 6-digit string
    expires_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS Configuration
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Only Master Admins should typically access these audit records
CREATE POLICY "Master Admins can view all credit transactions"
    ON public.credit_transactions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master_admin'));

CREATE POLICY "Master Admins can manage OTPs"
    ON public.otp_verifications FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master_admin'));

-- Initial indexing for performance
CREATE INDEX IF NOT EXISTS idx_credit_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_admin_user ON public.otp_verifications(admin_id, user_id);
