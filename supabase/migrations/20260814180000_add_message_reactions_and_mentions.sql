-- Migration: Add reactions and player mentions to messages table
-- Timestamp: 20260814180000

-- 1. Add reactions (JSONB) and mentioned_user_ids (UUID array)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb NOT NULL;

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS mentioned_user_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL;

-- 2. Create helper RPC for atomic reaction toggles
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(
  p_message_id UUID,
  p_emoji TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
  v_current_reactions JSONB;
  v_user_array JSONB;
  v_new_array JSONB;
  v_updated_reactions JSONB;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user has permission to view this message
  IF NOT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = p_message_id
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.system_role = 'super_admin' OR p.role = 'master_admin'))
      OR
      (m.team_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.tournament_registrations tr WHERE tr.team_id = m.team_id AND tr.user_id = auth.uid() AND tr.status = ANY (ARRAY['paid', 'confirmed', 'registered', 'drafted']))
        OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = m.team_id AND t.captain_id = auth.uid())
      ))
      OR
      (m.team_id IS NULL AND (
        EXISTS (SELECT 1 FROM public.bookings b WHERE b.game_id = m.event_id AND b.user_id = auth.uid() AND b.status = ANY (ARRAY['paid', 'active', 'free_agent_pending', 'confirmed', 'checked_in']))
        OR EXISTS (SELECT 1 FROM public.games g WHERE g.id = m.event_id AND auth.uid() = ANY(g.host_ids))
        OR EXISTS (SELECT 1 FROM public.teams t WHERE t.game_id = m.event_id AND t.captain_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.tournament_registrations tr JOIN public.teams t ON t.id = tr.team_id WHERE t.game_id = m.event_id AND tr.user_id = auth.uid() AND tr.status = ANY (ARRAY['paid', 'confirmed', 'registered', 'drafted']))
      ))
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to message';
  END IF;

  -- Lock row to prevent race conditions
  SELECT COALESCE(reactions, '{}'::jsonb) INTO v_current_reactions
  FROM public.messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF v_current_reactions IS NULL THEN
    v_current_reactions := '{}'::jsonb;
  END IF;

  -- Get current array of user IDs for this emoji
  v_user_array := COALESCE(v_current_reactions -> p_emoji, '[]'::jsonb);

  -- Check if user already reacted with this emoji
  IF v_user_array ? v_user_id THEN
    -- Remove user reaction
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    INTO v_new_array
    FROM jsonb_array_elements_text(v_user_array) elem
    WHERE elem <> v_user_id;
  ELSE
    -- Add user reaction
    v_new_array := v_user_array || to_jsonb(v_user_id);
  END IF;

  -- Update reactions JSONB
  IF jsonb_array_length(v_new_array) = 0 THEN
    v_updated_reactions := v_current_reactions - p_emoji;
  ELSE
    v_updated_reactions := jsonb_set(v_current_reactions, ARRAY[p_emoji], v_new_array);
  END IF;

  UPDATE public.messages
  SET reactions = v_updated_reactions
  WHERE id = p_message_id;

  RETURN v_updated_reactions;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(UUID, TEXT) TO authenticated, service_role;

-- 3. Add Update policy for messages
DROP POLICY IF EXISTS "Update messages policy" ON "public"."messages";

CREATE POLICY "Update messages policy" ON "public"."messages" FOR UPDATE USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
  ))
  OR
  (user_id = auth.uid())
  OR
  (
    messages.team_id IS NULL AND (
      EXISTS (
        SELECT 1 FROM public.games g 
        WHERE g.id = messages.event_id 
        AND auth.uid() = ANY(g.host_ids)
      )
    )
  )
);
