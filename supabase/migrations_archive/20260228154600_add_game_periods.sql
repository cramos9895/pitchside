-- Add game_periods to leagues table
alter table public.leagues add column if not exists game_periods text;
