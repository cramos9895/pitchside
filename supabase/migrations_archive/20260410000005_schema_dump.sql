
-- Create a table for public profiles (linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text check (role in ('admin', 'player')) default 'player',
  position text check (position in ('Forward', 'Midfielder', 'Defender', 'Goalkeeper', 'Utility')),
  bio text,
  mvp_awards integer default 0,
  updated_at timestamp with time zone
);

-- Navigate Row Level Security (RLS) for profiles
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create games table
create table games (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  location text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  price numeric default 10.00,
  max_players integer default 22,
  current_players integer default 0,
  surface_type text, -- 'Turf', 'Grass', 'Indoor'
  teams_config jsonb default '[{"name": "Team A", "color": "Neon Orange", "limit": 11}, {"name": "Team B", "color": "White", "limit": 11}]'::jsonb,
  status text check (status in ('scheduled', 'active', 'completed', 'cancelled')) default 'scheduled',
  home_score integer default 0,
  away_score integer default 0,
  mvp_player_id uuid REFERENCES profiles(id),
  round_number integer default 1
);

-- Enable RLS for games
alter table games enable row level security;

create policy "Games are viewable by everyone."
  on games for select
  using ( true );

-- Allow authenticated users (admins/players) to insert games for now (simplification)
create policy "Authenticated users can insert games."
  on games for insert
  with check ( auth.role() = 'authenticated' );

create policy "Authenticated users can update games."
  on games for update
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can delete games."
  on games for delete
  using ( auth.role() = 'authenticated' );

-- Create bookings table
create table bookings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references profiles(id) not null,
  game_id uuid references games(id) not null,
  status text check (status in ('pending', 'paid')) default 'pending',
  checked_in boolean default false,
  team_assignment text, -- Stores values like 'Team A', 'Red Team', etc.
  note text, -- 'Request to play with...' etc
  is_winner boolean default false
);

-- Enable RLS for bookings
alter table bookings enable row level security;

create policy "Users can view their own bookings."
  on bookings for select
  using ( auth.uid() = user_id );

create policy "Users can create their own bookings."
  on bookings for insert
  with check ( auth.uid() = user_id );

-- Insert Dummy Data --

-- Game 1: Tomorrow Night
insert into games (title, location, start_time, price, max_players, current_players, surface_type)
values (
  'Friday Night Lights',
  'Schaumburg Sport Center',
  now() + interval '1 day',
  15.00,
  14,
  8,
  'Turf'
);

-- Game 2: Weekend Morning
insert into games (title, location, start_time, price, max_players, current_players, surface_type)
values (
  'Sunday Morning Scrimmage',
  'Olympic Park, Schaumburg',
  now() + interval '3 days',
  10.00,
  22,
  4,
  'Grass'
);
