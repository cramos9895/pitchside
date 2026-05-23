-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT 'true'::jsonb,
    label TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users (Required for server actions triggered by users)
CREATE POLICY "Allow read access to authenticated users"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

-- Allow update access strictly to master_admin
CREATE POLICY "Allow update access to master_admin"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'master_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'master_admin'
    )
);

-- Seed Data
INSERT INTO public.system_settings (key, value, label, description, category)
VALUES
    ('notification.welcome', 'true'::jsonb, 'Welcome Email', 'Sent when a new user signs up.', 'notification'),
    ('notification.confirmation', 'true'::jsonb, 'Game Confirmation', 'Sent when a user joins a game.', 'notification'),
    ('notification.cancellation', 'true'::jsonb, 'Cancellation Receipt', 'Sent when a user leaves a game.', 'notification'),
    ('notification.waitlist', 'true'::jsonb, 'Waitlist Alert', 'Sent to the next user when a spot opens up.', 'notification')
ON CONFLICT (key) DO NOTHING;