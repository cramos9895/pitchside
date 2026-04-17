-- 🏗️ Architecture: [[RollingLeague.md]]
-- Implements secure, isolated chat for team squads by adding team context to the messages table.

-- 1. Add team_id to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;

-- 2. Refine RLS for private team chat
-- We drop existing policies to ensure our new isolation logic is the source of truth.
DROP POLICY IF EXISTS "Select messages policy" ON public.messages;
DROP POLICY IF EXISTS "Insert messages policy" ON public.messages;

-- Policy: Select messages (ONLY for team members or Admins)
CREATE POLICY "Select messages policy" ON public.messages
FOR SELECT
USING (
    -- Case 1: User is a member of the team (from tournament_registrations)
    EXISTS (
        SELECT 1 FROM public.tournament_registrations tr
        WHERE tr.team_id = messages.team_id
        AND tr.user_id = auth.uid()
        AND tr.status IN ('paid', 'confirmed', 'registered', 'drafted')
    )
    OR
    -- Case 2: User is a member of the team (legacy teams table check)
    EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = messages.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    -- Case 3: User is an admin
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
    )
);

-- Policy: Insert messages (ONLY for team members or Admins)
CREATE POLICY "Insert messages policy" ON public.messages
FOR INSERT
WITH CHECK (
    -- User is sending to their own team
    EXISTS (
        SELECT 1 FROM public.tournament_registrations tr
        WHERE tr.team_id = messages.team_id
        AND tr.user_id = auth.uid()
        AND tr.status IN ('paid', 'confirmed', 'registered', 'drafted')
    )
    OR
    EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = messages.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    -- Admins can broadcast
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
    )
);
