-- Phase 42: Tournament Operations & Event Marketing

-- 1. `games` table updates
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS reward text,
ADD COLUMN IF NOT EXISTS prize_pool_percentage integer,
ADD COLUMN IF NOT EXISTS refund_cutoff_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS roster_lock_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS strict_waiver_required boolean default false,
ADD COLUMN IF NOT EXISTS mercy_rule_cap integer;

-- 2. `waiver_signatures` table updates
ALTER TABLE public.waiver_signatures
ADD COLUMN IF NOT EXISTS game_id uuid references public.games(id) on delete cascade;

-- 3. `bookings` table updates
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS prize_split_preference text;
