create table match_officials (
    id uuid primary key default gen_random_uuid(),
    match_id uuid references matches(id) on delete cascade not null,
    user_id uuid references profiles(id) on delete cascade not null,
    role text not null,
    status text not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    constraint match_officials_status_check check (status in ('Pending', 'Confirmed', 'Waitlist', 'Rejected'))
);

alter table match_officials enable row level security;

-- Referees can select their own rows, or see all rows if they want to know who is on a match?
-- Wait, the open market needs to know if a match has a confirmed Center ref. 
-- Thus, all authenticated users should be able to read match_officials to check status.
create policy "Anyone can read match officials" on match_officials
    for select using (auth.role() = 'authenticated');

-- Referees can insert their own applications
create policy "Referees can apply for matches" on match_officials
    for insert with check (
        auth.uid() = user_id
        and (
            exists (
                select 1 from profiles
                where profiles.id = auth.uid()
                and (profiles.role = 'referee' or profiles.role = 'admin' or profiles.role = 'master_admin')
            )
        )
    );

-- Users can update their own application (e.g. to cancel)
create policy "Users can update their own application" on match_officials
    for update using (auth.uid() = user_id);

-- Admins can do everything
create policy "Admins can manage match officials" on match_officials
    for all using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and (profiles.role = 'admin' or profiles.role = 'master_admin')
        )
    );
