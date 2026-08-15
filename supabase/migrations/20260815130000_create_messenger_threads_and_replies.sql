-- Migration: Create Messenger threads, members, replies, and secure RLS policies
-- Timestamp: 20260815130000

-- 1. Create conversation_threads table
CREATE TABLE IF NOT EXISTS public.conversation_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'event')),
    title TEXT DEFAULT NULL,
    event_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create conversation_members table
CREATE TABLE IF NOT EXISTS public.conversation_members (
    conversation_id UUID NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);

-- 3. Add conversation_id and reply_to_id to public.messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversation_threads(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- 4. Enable Row Level Security (The Wall of RLS)
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies for conversation_threads
DROP POLICY IF EXISTS "Users can view their conversation threads" ON public.conversation_threads;
CREATE POLICY "Users can view their conversation threads" 
ON public.conversation_threads FOR SELECT 
TO authenticated 
USING (
    (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
    ))
    OR
    (EXISTS (
        SELECT 1 FROM public.conversation_members cm 
        WHERE cm.conversation_id = conversation_threads.id 
        AND cm.user_id = auth.uid()
    ))
    OR
    (conversation_threads.event_id IS NOT NULL AND (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.game_id = conversation_threads.event_id 
            AND b.user_id = auth.uid() 
            AND b.status = ANY (ARRAY['paid', 'active', 'free_agent_pending', 'confirmed', 'checked_in'])
        )
        OR
        EXISTS (
            SELECT 1 FROM public.games g 
            WHERE g.id = conversation_threads.event_id 
            AND auth.uid() = ANY(g.host_ids)
        )
    ))
);

DROP POLICY IF EXISTS "Authenticated users can create conversation threads" ON public.conversation_threads;
CREATE POLICY "Authenticated users can create conversation threads" 
ON public.conversation_threads FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

DROP POLICY IF EXISTS "Users can update their own conversation threads" ON public.conversation_threads;
CREATE POLICY "Users can update their own conversation threads" 
ON public.conversation_threads FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members cm 
        WHERE cm.conversation_id = conversation_threads.id 
        AND cm.user_id = auth.uid()
    )
);

-- 6. Strict RLS Policies for conversation_members
DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
CREATE POLICY "Users can view members of their conversations" 
ON public.conversation_members FOR SELECT 
TO authenticated 
USING (
    (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
    ))
    OR
    (EXISTS (
        SELECT 1 FROM public.conversation_members cm2 
        WHERE cm2.conversation_id = conversation_members.conversation_id 
        AND cm2.user_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS "Users can insert members to conversations" ON public.conversation_members;
CREATE POLICY "Users can insert members to conversations" 
ON public.conversation_members FOR INSERT 
TO authenticated 
WITH CHECK (
    user_id = auth.uid() 
    OR 
    EXISTS (
        SELECT 1 FROM public.conversation_threads ct 
        WHERE ct.id = conversation_members.conversation_id 
        AND ct.created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their own member record" ON public.conversation_members;
CREATE POLICY "Users can update their own member record" 
ON public.conversation_members FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_members;
CREATE POLICY "Users can leave conversations" 
ON public.conversation_members FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

-- 7. Update Messages RLS Policies to support conversation_id
DROP POLICY IF EXISTS "Insert messages policy" ON "public"."messages";
CREATE POLICY "Insert messages policy" ON "public"."messages" FOR INSERT TO authenticated WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
  ))
  OR
  (
    messages.conversation_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.conversation_members cm 
        WHERE cm.conversation_id = messages.conversation_id 
        AND cm.user_id = auth.uid()
      )
    )
  )
  OR
  (
    messages.team_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.tournament_registrations tr 
        WHERE tr.team_id = messages.team_id 
        AND tr.user_id = auth.uid() 
        AND tr.status = ANY (ARRAY['paid', 'confirmed', 'registered', 'drafted'])
      )
      OR
      EXISTS (
        SELECT 1 FROM public.teams t 
        WHERE t.id = messages.team_id 
        AND t.captain_id = auth.uid()
      )
    )
  )
  OR
  (
    messages.team_id IS NULL AND messages.event_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.game_id = messages.event_id 
        AND b.user_id = auth.uid() 
        AND b.status = ANY (ARRAY['paid', 'active', 'free_agent_pending', 'confirmed', 'checked_in'])
      )
      OR
      EXISTS (
        SELECT 1 FROM public.games g 
        WHERE g.id = messages.event_id 
        AND auth.uid() = ANY(g.host_ids)
      )
      OR
      EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.game_id = messages.event_id 
        AND t.captain_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.tournament_registrations tr
        JOIN public.teams t ON t.id = tr.team_id
        WHERE t.game_id = messages.event_id
        AND tr.user_id = auth.uid()
        AND tr.status = ANY (ARRAY['paid', 'confirmed', 'registered', 'drafted'])
      )
    )
  )
);

DROP POLICY IF EXISTS "Select messages policy" ON "public"."messages";
CREATE POLICY "Select messages policy" ON "public"."messages" FOR SELECT TO authenticated USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
  ))
  OR
  (
    messages.conversation_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.conversation_members cm 
        WHERE cm.conversation_id = messages.conversation_id 
        AND cm.user_id = auth.uid()
      )
    )
  )
  OR
  (
    messages.team_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.tournament_registrations tr 
        WHERE tr.team_id = messages.team_id 
        AND tr.user_id = auth.uid() 
        AND tr.status = ANY (ARRAY['paid', 'confirmed', 'registered', 'drafted'])
      )
      OR
      EXISTS (
        SELECT 1 FROM public.teams t 
        WHERE t.id = messages.team_id 
        AND t.captain_id = auth.uid()
      )
    )
  )
  OR
  (
    messages.team_id IS NULL AND messages.event_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.game_id = messages.event_id 
        AND b.user_id = auth.uid() 
        AND b.status = ANY (ARRAY['paid', 'active', 'free_agent_pending', 'confirmed', 'checked_in'])
      )
      OR
      EXISTS (
        SELECT 1 FROM public.games g 
        WHERE g.id = messages.event_id 
        AND auth.uid() = ANY(g.host_ids)
      )
      OR
      EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.game_id = messages.event_id 
        AND t.captain_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.tournament_registrations tr
        JOIN public.teams t ON t.id = tr.team_id
        WHERE t.game_id = messages.event_id
        AND tr.user_id = auth.uid()
        AND tr.status = ANY (ARRAY['paid', 'confirmed', 'registered', 'drafted'])
      )
    )
  )
);

-- 8. Add DELETE policy on notifications for user dismissal
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" 
ON public.notifications FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
