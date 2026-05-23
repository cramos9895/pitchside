-- Create resources table to track Fields, Courts, and other bookable facility areas
create table public.resources (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  facility_id uuid references public.facilities(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('Soccer', 'Basketball', 'Volleyball', 'Tennis', 'Pickleball', 'Multi-purpose', 'Other')),
  is_active boolean default true
);

-- Active updated_at trigger
create trigger handle_updated_at before update on public.resources
  for each row execute procedure moddatetime('updated_at');

-- Enable RLS
alter table public.resources enable row level security;

-- Policies
create policy "Resources are viewable by everyone"
  on public.resources for select
  using ( true );

-- Admins can manage their own facility resources, Super Admins can manage all
create policy "Facility admins can manage resources"
  on public.resources
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and (
        profiles.system_role = 'super_admin'
        or (profiles.system_role = 'facility_admin' and profiles.facility_id = resources.facility_id)
      )
    )
  );
