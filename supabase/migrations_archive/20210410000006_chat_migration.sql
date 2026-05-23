-- Add host_ids array to games table
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS host_ids UUID[] DEFAULT '{}'::uuid[];

-- Add last_read_at to bookings table for unread red dot logic
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add is_broadcast to messages for Host broadcasts
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT false;
