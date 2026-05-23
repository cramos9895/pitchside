-- Enable the moddatetime extension
create extension if not exists moddatetime schema extensions;

-- Create league_matches table
create table public.league_matches (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  league_id uuid references public.leagues(id) on delete cascade not null,
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  week_number integer not null default 1,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  status text not null check (status in ('scheduled', 'active', 'completed', 'cancelled')) default 'scheduled',
  home_score integer,
  away_score integer,
  match_type text not null check (match_type in ('regular_season', 'playoff', 'final')) default 'regular_season'
);

-- Active updated_at trigger for league_matches
create trigger handle_league_matches_updated_at before update on public.league_matches
  for each row execute procedure extensions.moddatetime('updated_at');

-- Enable RLS
alter table public.league_matches enable row level security;

-- Policies
create policy "League matches are viewable by everyone"
  on public.league_matches for select
  using ( true );

create policy "Facility admins can manage league matches"
  on public.league_matches
  using (
    exists (
      select 1 from public.leagues l
      join public.profiles p on p.id = auth.uid()
      where l.id = league_matches.league_id
      and (
        p.system_role = 'super_admin' or p.role = 'master_admin'
        or (p.system_role = 'facility_admin' and p.facility_id = l.facility_id)
      )
    )
  );
