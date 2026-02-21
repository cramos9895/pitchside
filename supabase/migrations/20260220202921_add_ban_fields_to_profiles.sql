-- Add Advanced Admin Controls to profiles table
ALTER TABLE public.profiles
ADD COLUMN is_banned BOOLEAN DEFAULT false,
ADD COLUMN banned_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN ban_reason TEXT;
