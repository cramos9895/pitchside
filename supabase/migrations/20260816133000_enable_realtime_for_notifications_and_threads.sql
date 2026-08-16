-- Migration: Enable Supabase Realtime for notifications, conversation_threads, and conversation_members
-- Timestamp: 20260816133000

-- 1. Set replica identity to FULL so realtime payloads contain all columns
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_threads REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 2. Add tables to supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_threads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_threads;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
    END IF;
END $$;
