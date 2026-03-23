-- Allow teams and tournament_registrations to link to either leagues or games
ALTER TABLE public.teams ALTER COLUMN league_id DROP NOT NULL;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS game_id uuid references public.games(id) on delete cascade;
ALTER TABLE public.teams ADD CONSTRAINT team_event_check CHECK (league_id IS NOT NULL OR game_id IS NOT NULL);

ALTER TABLE public.tournament_registrations ALTER COLUMN league_id DROP NOT NULL;
ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS game_id uuid references public.games(id) on delete cascade;
ALTER TABLE public.tournament_registrations ADD CONSTRAINT tr_event_check CHECK (league_id IS NOT NULL OR game_id IS NOT NULL);

-- Update RLS policies to account for game_id
DROP POLICY IF EXISTS "Facility admins can manage all teams in their facility" ON public.teams;
CREATE POLICY "Facility admins can manage all teams in their facility"
  ON public.teams
  USING (
    exists (
      select 1 from public.leagues l
      join public.profiles p on p.id = auth.uid()
      where l.id = teams.league_id
      and (p.system_role = 'super_admin' or p.role = 'master_admin' or (p.system_role = 'facility_admin' and p.facility_id = l.facility_id))
    )
    OR
    exists (
      select 1 from public.games g
      join public.facilities f on f.id = g.facility_id
      join public.profiles p on p.id = auth.uid()
      where g.id = teams.game_id
      and (p.system_role = 'super_admin' or p.role = 'master_admin' or (p.system_role = 'facility_admin' and p.facility_id = f.id))
    )
  );

DROP POLICY IF EXISTS "Facility admins can manage tournament registrations" ON public.tournament_registrations;
CREATE POLICY "Facility admins can manage tournament registrations"
  ON public.tournament_registrations
  USING (
    exists (
      select 1 from public.leagues l
      join public.profiles p on p.id = auth.uid()
      where l.id = tournament_registrations.league_id
      and (p.system_role = 'super_admin' or p.role = 'master_admin' or (p.system_role = 'facility_admin' and p.facility_id = l.facility_id))
    )
    OR
    exists (
      select 1 from public.games g
      join public.facilities f on f.id = g.facility_id
      join public.profiles p on p.id = auth.uid()
      where g.id = tournament_registrations.game_id
      and (p.system_role = 'super_admin' or p.role = 'master_admin' or (p.system_role = 'facility_admin' and p.facility_id = f.id))
    )
  );
