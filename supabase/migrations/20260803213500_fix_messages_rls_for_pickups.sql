-- Fix RLS for messages table to support unstructured Pickup games

-- Drop existing restricted policies
DROP POLICY IF EXISTS "Insert messages policy" ON "public"."messages";
DROP POLICY IF EXISTS "Select messages policy" ON "public"."messages";

-- Create robust Insert policy
CREATE POLICY "Insert messages policy" ON "public"."messages" FOR INSERT WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
  ))
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
    messages.team_id IS NULL AND (
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

-- Create robust Select policy
CREATE POLICY "Select messages policy" ON "public"."messages" FOR SELECT USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
  ))
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
    messages.team_id IS NULL AND (
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
