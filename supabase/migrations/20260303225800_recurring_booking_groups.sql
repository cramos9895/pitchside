CREATE TABLE IF NOT EXISTS public.recurring_booking_groups (
    id UUID PRIMARY KEY, -- Will be explicitly mapped to recurring_group_id from resource_bookings
    facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    payment_term TEXT CHECK (payment_term IN ('upfront', 'weekly')),
    final_price INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.recurring_booking_groups ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own groups"
    ON public.recurring_booking_groups FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Facility admins can view groups for their facility"
    ON public.recurring_booking_groups FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.facility_id = recurring_booking_groups.facility_id
            AND p.system_role = 'facility_admin'
        )
    );

CREATE POLICY "Super admins can view all groups"
    ON public.recurring_booking_groups FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.system_role = 'super_admin' OR p.role = 'master_admin')
        )
    );
