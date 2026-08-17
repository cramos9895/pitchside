-- Migration: 20260817000000_compliance_account_deletion_and_push_tokens.sql
-- Description: Create user_push_tokens table and delete_user_account RPC for Apple & Google compliance

-- 1. Create user_push_tokens Table
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT user_push_tokens_user_token_unique UNIQUE(user_id, token)
);

-- Indices for push dispatch queries
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_active ON public.user_push_tokens(is_active);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Admins can view push tokens" ON public.user_push_tokens;

-- RLS Policies
CREATE POLICY "Users can manage their own push tokens"
    ON public.user_push_tokens
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view push tokens"
    ON public.user_push_tokens
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('master_admin', 'host')
        )
    );

-- Add is_deleted column to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_deleted BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Create delete_user_account RPC Function
-- This function allows authenticated users to self-delete their account in full compliance with Apple Guideline 5.1.1(v) & Google Play Policy
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_user_id UUID := auth.uid();
BEGIN
    -- Verify the caller is an authenticated user
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Remove push notification tokens
    DELETE FROM public.user_push_tokens WHERE user_id = current_user_id;

    -- 2. Remove in-app notifications
    DELETE FROM public.notifications WHERE user_id = current_user_id;

    -- 3. Remove conversation thread memberships
    DELETE FROM public.conversation_members WHERE user_id = current_user_id;

    -- 4. Anonymize chat messages
    UPDATE public.messages 
    SET content = 'This message was deleted.' 
    WHERE user_id = current_user_id;

    -- 5. Clear personal notes on bookings
    UPDATE public.bookings 
    SET note = '' 
    WHERE user_id = current_user_id;

    -- 6. Disband or unassign captaincy to prevent FK constraint issues
    UPDATE public.teams 
    SET captain_id = NULL 
    WHERE captain_id = current_user_id;

    -- 7. Remove team players, match players, and referee applications
    DELETE FROM public.team_players WHERE user_id = current_user_id;
    DELETE FROM public.match_players WHERE user_id = current_user_id;
    DELETE FROM public.referee_applications WHERE user_id = current_user_id;

    -- 8. Anonymize profile data (retaining row to maintain booking & transaction ledger foreign keys)
    UPDATE public.profiles 
    SET first_name = 'Deleted',
        last_name = 'Player',
        phone_number = NULL,
        zip_code = NULL,
        avatar_url = NULL,
        bio = '',
        is_deleted = true
    WHERE id = current_user_id;

    -- 9. Delete user record from auth.users (cascades session termination)
    DELETE FROM auth.users WHERE id = current_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Account successfully deleted and data anonymized.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
