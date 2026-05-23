CREATE TABLE IF NOT EXISTS public.match_suspensions (
  id uuid default gen_random_uuid() primary key,
  match_id uuid not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reason text
);

ALTER TABLE public.match_suspensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match suspensions viewable by everyone"
  ON public.match_suspensions FOR SELECT
  USING ( true );

-- Drop the old constraint if it exists and add a new one including 'banned'
ALTER TABLE public.tournament_registrations DROP CONSTRAINT IF EXISTS tournament_registrations_status_check;
ALTER TABLE public.tournament_registrations ADD CONSTRAINT tournament_registrations_status_check CHECK (status in ('registered', 'drafted', 'waitlisted', 'cancelled', 'banned'));
