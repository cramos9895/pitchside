-- Create activity_types table
create table public.activity_types (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  facility_id uuid references public.facilities(id) on delete cascade not null,
  name text not null, -- e.g., 'Soccer', 'Basketball'
  color_code text not null default '#00FF00', -- Hex color for UI representation
  is_active boolean default true not null,
  unique (facility_id, name) -- Prevent duplicate sports within the same facility
);

-- Active updated_at trigger for activity_types
create trigger handle_activity_types_updated_at before update on public.activity_types
  for each row execute procedure moddatetime('updated_at');

-- Enable RLS
alter table public.activity_types enable row level security;

-- Policies for activity_types
create policy "Activity Types are viewable by everyone"
  on public.activity_types for select
  using ( true );

create policy "Facility admins can manage activity types"
  on public.activity_types
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and (
        profiles.system_role = 'super_admin' or profiles.role = 'master_admin'
        or (profiles.system_role = 'facility_admin' and profiles.facility_id = activity_types.facility_id)
      )
    )
  );
