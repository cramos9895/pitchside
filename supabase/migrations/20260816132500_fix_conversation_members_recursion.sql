-- Migration: Fix infinite recursion in conversation_members RLS policy using SECURITY DEFINER helper
-- Timestamp: 20260816132500

-- 1. Create non-recursive SECURITY DEFINER helper function
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
$$;

-- 2. Fix conversation_members RLS policies
DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
CREATE POLICY "Users can view members of their conversations" 
ON public.conversation_members FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid()
    OR
    public.is_conversation_member(conversation_id, auth.uid())
    OR
    (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
    ))
);

-- 3. Fix conversation_threads RLS policies
DROP POLICY IF EXISTS "Users can view their conversation threads" ON public.conversation_threads;
CREATE POLICY "Users can view their conversation threads" 
ON public.conversation_threads FOR SELECT 
TO authenticated 
USING (
    created_by = auth.uid()
    OR
    public.is_conversation_member(id, auth.uid())
    OR
    (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
    ))
    OR
    (event_id IS NOT NULL AND (
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

DROP POLICY IF EXISTS "Users can update their own conversation threads" ON public.conversation_threads;
CREATE POLICY "Users can update their own conversation threads" 
ON public.conversation_threads FOR UPDATE 
TO authenticated 
USING (
    created_by = auth.uid()
    OR
    public.is_conversation_member(id, auth.uid())
);

-- 4. Fix messages RLS policies (supporting conversation_id, event_id, team_id, and team chats)
DROP POLICY IF EXISTS "Insert messages policy" ON "public"."messages";
CREATE POLICY "Insert messages policy" ON "public"."messages" FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND
  (
    (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
    ))
    OR
    (
      messages.conversation_id IS NOT NULL AND public.is_conversation_member(messages.conversation_id, auth.uid())
    )
    OR
    (
      messages.team_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM public.tournament_registrations tr 
          WHERE tr.team_id = messages.team_id 
          AND tr.user_id = auth.uid() 
          AND tr.status = ANY (ARRAY['paid', 'confirmed', 'registered', 'drafted', 'active', 'pending'])
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
      messages.event_id IS NOT NULL AND (
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
          SELECT 1 FROM public.teams t
          WHERE t.id = messages.event_id 
          AND (
            t.captain_id = auth.uid()
            OR
            EXISTS (
              SELECT 1 FROM public.tournament_registrations tr
              WHERE tr.team_id = t.id AND tr.user_id = auth.uid()
            )
          )
        )
        OR
        EXISTS (
          SELECT 1 FROM public.tournament_registrations tr
          JOIN public.teams t ON t.id = tr.team_id
          WHERE t.game_id = messages.event_id
          AND tr.user_id = auth.uid()
          AND tr.status = ANY (ARRAY['paid', 'confirmed', 'registered', 'drafted', 'active', 'pending'])
        )
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
    messages.conversation_id IS NOT NULL AND public.is_conversation_member(messages.conversation_id, auth.uid())
  )
  OR
  (
    messages.team_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.tournament_registrations tr 
        WHERE tr.team_id = messages.team_id 
        AND tr.user_id = auth.uid() 
        AND tr.status = ANY (ARRAY['paid', 'confirmed', 'registered', 'drafted', 'active', 'pending'])
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
    messages.event_id IS NOT NULL AND (
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
        SELECT 1 FROM public.teams t
        WHERE t.id = messages.event_id 
        AND (
          t.captain_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 FROM public.tournament_registrations tr
            WHERE tr.team_id = t.id AND tr.user_id = auth.uid()
          )
        )
      )
      OR
      EXISTS (
        SELECT 1 FROM public.tournament_registrations tr
        JOIN public.teams t ON t.id = tr.team_id
        WHERE t.game_id = messages.event_id
        AND tr.user_id = auth.uid()
        AND tr.status = ANY (ARRAY['paid', 'confirmed', 'registered', 'drafted', 'active', 'pending'])
      )
    )
  )
);
