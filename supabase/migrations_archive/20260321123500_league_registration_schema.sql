-- Add registration cutoffs to leagues
ALTER TABLE public.leagues 
ADD COLUMN IF NOT EXISTS registration_cutoff timestamp with time zone;

-- Add captain specifics to teams
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS primary_color text,
ADD COLUMN IF NOT EXISTS accepting_free_agents boolean default false;

-- Create tournament_registrations table for the draft pool & team associations
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  league_id uuid references public.leagues(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade,
  preferred_positions text[],
  status text not null check (status in ('registered', 'drafted', 'waitlisted', 'cancelled')) default 'registered',
  unique(league_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tournament registrations are viewable by everyone"
  ON public.tournament_registrations FOR SELECT
  USING ( true );

CREATE POLICY "Users can manage their own tournament registrations"
  ON public.tournament_registrations
  USING ( user_id = auth.uid() );

CREATE POLICY "Facility admins can manage tournament registrations"
  ON public.tournament_registrations
  USING (
    exists (
      select 1 from public.leagues l
      join public.profiles p on p.id = auth.uid()
      where l.id = tournament_registrations.league_id
      and (
        p.system_role = 'super_admin' or p.role = 'master_admin'
        or (p.system_role = 'facility_admin' and p.facility_id = l.facility_id)
      )
    )
  );
mode:AGENT_MODE_EXECUTION
