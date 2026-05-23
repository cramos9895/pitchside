-- Enable the moddatetime extension
create extension if not exists moddatetime schema extensions;

-- Create leagues table
create table public.leagues (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  facility_id uuid references public.facilities(id) on delete cascade not null,
  name text not null,
  description text,
  sport text not null check (sport in ('Soccer', 'Basketball', 'Volleyball', 'Tennis', 'Pickleball', 'Other')),
  status text not null check (status in ('draft', 'registration', 'active', 'completed', 'cancelled')) default 'draft',
  season text, -- e.g., 'Spring 2026'
  start_date date,
  end_date date,
  max_teams integer,
  price_per_team numeric,
  price_per_free_agent numeric
);

-- Active updated_at trigger for leagues
create trigger handle_leagues_updated_at before update on public.leagues
  for each row execute procedure moddatetime('updated_at');

-- Create teams table
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  league_id uuid references public.leagues(id) on delete cascade not null,
  name text not null,
  captain_id uuid references public.profiles(id) on delete restrict,
  status text not null check (status in ('pending', 'approved', 'waitlisted', 'rejected')) default 'pending'
);

-- Active updated_at trigger for teams
create trigger handle_teams_updated_at before update on public.teams
  for each row execute procedure moddatetime('updated_at');

-- Create team_players table (roster)
create table public.team_players (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('captain', 'player', 'coach')) default 'player',
  status text not null check (status in ('pending', 'confirmed', 'rejected')) default 'pending',
  unique(team_id, user_id)
);

-- Enable RLS
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.team_players enable row level security;

-- Policies for leagues
create policy "Leagues are viewable by everyone"
  on public.leagues for select
  using ( true );

create policy "Facility admins can manage leagues"
  on public.leagues
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and (
        profiles.system_role = 'super_admin' or profiles.role = 'master_admin'
        or (profiles.system_role = 'facility_admin' and profiles.facility_id = leagues.facility_id)
      )
    )
  );

-- Policies for teams
create policy "Teams are viewable by everyone"
  on public.teams for select
  using ( true );

create policy "Captains can manage their teams"
  on public.teams for update
  using ( captain_id = auth.uid() );

create policy "Facility admins can manage all teams in their facility"
  on public.teams
  using (
    exists (
      select 1 from public.leagues l
      join public.profiles p on p.id = auth.uid()
      where l.id = teams.league_id
      and (
        p.system_role = 'super_admin' or p.role = 'master_admin'
        or (p.system_role = 'facility_admin' and p.facility_id = l.facility_id)
      )
    )
  );

-- Policies for team_players
create policy "Team rosters are viewable by everyone"
  on public.team_players for select
  using ( true );

create policy "Users can manage their own roster requests"
  on public.team_players
  using ( user_id = auth.uid() );

create policy "Captains can manage their team rosters"
  on public.team_players
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_players.team_id
      and teams.captain_id = auth.uid()
    )
  );
