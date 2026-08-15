-- Migration: Add link column to notifications table
-- Timestamp: 20260815120000

-- 1. Add link column to notifications table if it doesn't exist
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS link TEXT DEFAULT NULL;

-- 2. Ensure RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to insert notifications (e.g. for chat mentions/alerts)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow users to update (e.g. mark as read) their own notifications
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
