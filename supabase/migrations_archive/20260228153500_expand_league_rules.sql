-- Add expanded rules configuration to leagues table
alter table public.leagues add column if not exists format text;
alter table public.leagues add column if not exists game_length integer;
alter table public.leagues add column if not exists min_roster integer;
alter table public.leagues add column if not exists game_days text;
alter table public.leagues add column if not exists has_playoffs boolean default false;
alter table public.leagues add column if not exists playoff_spots integer;
