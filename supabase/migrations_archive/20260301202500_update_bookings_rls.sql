-- 1. Redefine RLS Policy for Resource Bookings
DROP POLICY IF EXISTS "Facility Admins have full access to their resource_bookings" ON public.resource_bookings;

CREATE POLICY "Facility Admins have full access to their resource_bookings"
ON public.resource_bookings
FOR ALL
USING ( facility_id IN (SELECT facility_id FROM public.profiles WHERE id = auth.uid()) );
