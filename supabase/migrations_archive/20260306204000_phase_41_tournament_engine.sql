-- Add event_type to games
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS event_type text check (event_type in ('standard', 'tournament')) default 'standard';

-- Ensure the matches table exists (from ScheduleGenerator) or create it
CREATE TABLE IF NOT EXISTS public.matches (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    game_id uuid references public.games(id) on delete cascade,
    home_team text not null,
    away_team text not null,
    home_score integer default 0,
    away_score integer default 0,
    round_number integer,
    status text not null default 'scheduled'
);

-- Add the user-requested tournament schema upgrades to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS game_id uuid references public.games(id) on delete cascade;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS tournament_stage text check (tournament_stage in ('group', 'semi_final', 'final')) default 'group';

-- Ensure moddatetime is setup for it
create extension if not exists moddatetime schema extensions;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'handle_matches_updated_at') then
    create trigger handle_matches_updated_at before update on public.matches
      for each row execute procedure extensions.moddatetime('updated_at');
  end if;
end $$;
