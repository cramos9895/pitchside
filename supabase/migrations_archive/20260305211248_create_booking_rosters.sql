-- Create booking_rosters table
CREATE TABLE IF NOT EXISTS public.booking_rosters (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_group_id uuid NOT NULL, -- Logical FK to either resource_bookings(id) or recurring_booking_groups(id)
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(booking_group_id, user_id)
);

-- Index for fast roster lookups
CREATE INDEX IF NOT EXISTS idx_booking_rosters_group_id ON public.booking_rosters(booking_group_id);
CREATE INDEX IF NOT EXISTS idx_booking_rosters_user_id ON public.booking_rosters(user_id);

-- Enable RLS
ALTER TABLE public.booking_rosters ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can view a roster if they are on it
CREATE POLICY "Users can view rosters they are on"
    ON public.booking_rosters FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Captains can view the roster for their bookings
CREATE POLICY "Captains can view their own booking rosters"
    ON public.booking_rosters FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.resource_bookings rb 
            WHERE rb.id = booking_rosters.booking_group_id 
            AND rb.renter_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM public.recurring_booking_groups rbg
            WHERE rbg.id = booking_rosters.booking_group_id
            AND rbg.user_id = auth.uid()
        )
    );

-- 3. Facility Admins can view all rosters for bookings at their facility
CREATE POLICY "Facility admins can view all rosters for their facility"
    ON public.booking_rosters FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.system_role = 'facility_admin'
            AND (
                EXISTS (
                    SELECT 1 FROM public.resource_bookings rb 
                    WHERE rb.id = booking_rosters.booking_group_id 
                    AND rb.facility_id = p.facility_id
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.recurring_booking_groups rbg
                    WHERE rbg.id = booking_rosters.booking_group_id
                    AND rbg.facility_id = p.facility_id
                )
            )
        )
    );

-- 4. Super Admins can view all rosters
CREATE POLICY "Super admins can view all rosters"
    ON public.booking_rosters FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
        )
    );

-- 5. Users can join a roster (Insert themselves)
CREATE POLICY "Users can join a roster"
    ON public.booking_rosters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 6. Captains can remove players from their roster
CREATE POLICY "Captains can remove players from their roster"
    ON public.booking_rosters FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.resource_bookings rb 
            WHERE rb.id = booking_rosters.booking_group_id 
            AND rb.renter_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM public.recurring_booking_groups rbg
            WHERE rbg.id = booking_rosters.booking_group_id
            AND rbg.user_id = auth.uid()
        )
    );

-- 7. Users can remove themselves from a roster
CREATE POLICY "Users can leave a roster"
    ON public.booking_rosters FOR DELETE
    USING (auth.uid() = user_id);
