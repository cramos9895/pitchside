-- Clean up the mistake from earlier where we added calendar fields to the player bookings table
DROP POLICY IF EXISTS "Facility Admins have full access to their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Super Admins have full access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
DROP INDEX IF EXISTS idx_bookings_facility_time;
DROP INDEX IF EXISTS idx_bookings_resource_time;
DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;

ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS facility_id,
  DROP COLUMN IF EXISTS resource_id,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS start_time,
  DROP COLUMN IF EXISTS end_time,
  DROP COLUMN IF EXISTS renter_name,
  DROP COLUMN IF EXISTS color;

-- Let's create the correct table for facility scheduling
CREATE TABLE IF NOT EXISTS public.resource_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    renter_name TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT resource_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_resource_bookings_facility_time ON public.resource_bookings(facility_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_resource_bookings_resource_time ON public.resource_bookings(resource_id, start_time, end_time);

ALTER TABLE public.resource_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access to resource_bookings"
ON public.resource_bookings
FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.system_role = 'super_admin' OR profiles.role = 'master_admin')));

CREATE POLICY "Facility Admins have full access to their resource_bookings"
ON public.resource_bookings
FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.facility_id = resource_bookings.facility_id AND profiles.system_role = 'facility_admin'));

CREATE POLICY "Anyone can view resource_bookings"
ON public.resource_bookings
FOR SELECT
USING (true);

CREATE TRIGGER set_resource_bookings_updated_at
BEFORE UPDATE ON public.resource_bookings
FOR EACH ROW
EXECUTE FUNCTION handle_bookings_updated_at();
