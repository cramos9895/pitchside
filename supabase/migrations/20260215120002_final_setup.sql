-- Final Setup for Notification System Settings
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT 'true'::jsonb,
    label TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Drop existing policies to avoid conflicts if previously created
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.system_settings;
DROP POLICY IF EXISTS "Allow update access to admins" ON public.system_settings;
DROP POLICY IF EXISTS "Allow update access to master_admin" ON public.system_settings;

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

-- 4. Seed Data
INSERT INTO public.system_settings (key, value, label, description, category)
VALUES
    ('notification.welcome', 'true'::jsonb, 'Welcome Email', 'Sent when a new user signs up.', 'notification'),
    ('notification.confirmation', 'true'::jsonb, 'Game Confirmation', 'Sent when a user joins a game.', 'notification'),
    ('notification.cancellation', 'true'::jsonb, 'Cancellation Receipt', 'Sent when a user leaves a game.', 'notification'),
    ('notification.waitlist', 'true'::jsonb, 'Waitlist Alert', 'Sent to the next user when a spot opens up.', 'notification')
ON CONFLICT (key) DO UPDATE
SET 
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    category = EXCLUDED.category;
