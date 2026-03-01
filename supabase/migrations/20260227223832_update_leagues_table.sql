-- Update leagues table
alter table public.leagues add column if not exists price numeric;
alter table public.leagues add column if not exists max_roster integer;
alter table public.leagues add column if not exists registration_open boolean default false;
alter table public.leagues add column if not exists activity_id uuid references public.activity_types(id);
