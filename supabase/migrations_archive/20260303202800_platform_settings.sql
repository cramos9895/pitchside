-- Create global settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id integer PRIMARY KEY CHECK (id = 1), -- Enforce only one row
    fee_type text NOT NULL CHECK (fee_type IN ('percent', 'fixed', 'both')) DEFAULT 'percent',
    fee_percent numeric DEFAULT 5.0,
    fee_fixed integer DEFAULT 100, -- Stored in cents, e.g., $1.00
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial row
INSERT INTO public.platform_settings (id, fee_type, fee_percent, fee_fixed)
VALUES (1, 'percent', 5.0, 100)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed by Stripe checkout API or public views)
CREATE POLICY "Anyone can view platform settings"
ON public.platform_settings
FOR SELECT
USING (true);

-- Only Super Admins can update
CREATE POLICY "Super Admins can update platform settings"
ON public.platform_settings
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.system_role = 'super_admin' OR profiles.role = 'master_admin')
    )
);

-- Deny inserts/deletes entirely (managed by seed and check constraint)
CREATE POLICY "Deny inserts to platform settings" ON public.platform_settings FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny deletes to platform settings" ON public.platform_settings FOR DELETE USING (false);

-- Simple updated_at trigger
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.platform_settings
    FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
