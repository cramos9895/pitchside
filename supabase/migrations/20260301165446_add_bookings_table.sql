-- We discovered the bookings table already exists remotely, probably from a prior unfinished test.
-- Rather than CREATE TABLE IF NOT EXISTS which silently ignores our defined columns,
-- we'll use ALTER TABLE to add what we need.

-- 1. Create the table if it absolutely doesn't exist at all
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
);

-- 2. Add our required columns IF NOT EXISTS to prevent errors if they are already there
ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS renter_name TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
    ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. We cannot easily add NOT NULL to existing columns that might have nulls without a default,
-- so we apply NOT NULL only to new schemas where we know we provide it, or we skip NOT NULL for now 
-- to avoid breaking existing phantom rows. The application logic will enforce it.

-- 4. Add constraints and indices safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'end_after_start') THEN
        ALTER TABLE public.bookings ADD CONSTRAINT end_after_start CHECK (end_time > start_time);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_facility_time ON public.bookings(facility_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_resource_time ON public.bookings(resource_id, start_time, end_time);

-- 5. Enable RLS and setup policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop them first if they exist to replace them cleanly
DROP POLICY IF EXISTS "Super Admins have full access to bookings" ON public.bookings;
CREATE POLICY "Super Admins have full access to bookings"
ON public.bookings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.system_role = 'super_admin' OR profiles.role = 'master_admin')
  )
);

DROP POLICY IF EXISTS "Facility Admins have full access to their bookings" ON public.bookings;
CREATE POLICY "Facility Admins have full access to their bookings"
ON public.bookings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.facility_id = bookings.facility_id
    AND profiles.system_role = 'facility_admin'
  )
);

DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
CREATE POLICY "Anyone can view bookings"
ON public.bookings
FOR SELECT
USING (true);

-- 6. updated_at Trigger
CREATE OR REPLACE FUNCTION handle_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION handle_bookings_updated_at();
