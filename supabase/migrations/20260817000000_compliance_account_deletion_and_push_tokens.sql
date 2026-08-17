-- Migration: 20260817000000_compliance_account_deletion_and_push_tokens.sql
-- Description: Create user_push_tokens table, fix cascade constraints, and create delete_user_account RPC for Apple & Google compliance

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

-- 2. Update Constraints to allow clean cascading deletions
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.teams 
DROP CONSTRAINT IF EXISTS teams_captain_id_fkey;

ALTER TABLE public.teams
ADD CONSTRAINT teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_buyer_id_fkey;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Create delete_user_account RPC Function
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_user_id UUID := auth.uid();
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Remove push notification tokens
    DELETE FROM public.user_push_tokens WHERE user_id = current_user_id;

    -- 2. Remove in-app notifications
    DELETE FROM public.notifications WHERE user_id = current_user_id;

    -- 3. Remove conversation thread memberships & messages
    DELETE FROM public.conversation_members WHERE user_id = current_user_id;
    DELETE FROM public.messages WHERE user_id = current_user_id;

    -- 4. Clear references in teams, games, credits, and bookings
    UPDATE public.bookings SET buyer_id = NULL WHERE buyer_id = current_user_id;
    UPDATE public.teams SET captain_id = NULL WHERE captain_id = current_user_id;
    UPDATE public.games SET mvp_player_id = NULL WHERE mvp_player_id = current_user_id;
    UPDATE public.credit_transactions SET admin_id = NULL WHERE admin_id = current_user_id;

    -- 5. Remove user records from participation tables
    DELETE FROM public.team_players WHERE user_id = current_user_id;
    DELETE FROM public.match_players WHERE user_id = current_user_id;
    DELETE FROM public.referee_applications WHERE user_id = current_user_id;
    DELETE FROM public.tournament_registrations WHERE user_id = current_user_id;
    DELETE FROM public.bookings WHERE user_id = current_user_id;
    DELETE FROM public.resource_bookings WHERE user_id = current_user_id;
    DELETE FROM public.waiver_signatures WHERE user_id = current_user_id;

    -- 6. Delete profile row
    DELETE FROM public.profiles WHERE id = current_user_id;

    -- 7. Delete auth user record
    DELETE FROM auth.users WHERE id = current_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Account successfully deleted.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
