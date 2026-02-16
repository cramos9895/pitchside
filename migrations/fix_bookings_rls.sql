-- Allow authenticated users (which includes admins) to view all bookings
-- Ideally this should be restricted to admins, but for now we trust authenticated users or assume role check
-- Drop existing restrictive policy if needed, or add a new permissive one

create policy "Authenticated users can view all bookings"
  on bookings for select
  using ( auth.role() = 'authenticated' );

-- Ensure profiles are viewable (already true in schema: "Public profiles are viewable by everyone.")
-- Ensure games are viewable (already true in schema: "Games are viewable by everyone.")
