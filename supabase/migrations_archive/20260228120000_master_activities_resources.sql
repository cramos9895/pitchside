-- 1. Detach Activity Types from Facilities (Make them Global Master Records)
ALTER TABLE public.activity_types 
DROP CONSTRAINT IF EXISTS activity_types_facility_id_fkey,
ALTER COLUMN facility_id DROP NOT NULL;

-- Remove the unique constraint that grouped by facility
ALTER TABLE public.activity_types DROP CONSTRAINT IF EXISTS activity_types_facility_id_name_key;

-- Add a new unique constraint for the global name
ALTER TABLE public.activity_types ADD CONSTRAINT activity_types_name_key UNIQUE (name);

-- 2. Create Global Resource Types Table (Master Admin Managed)
CREATE TABLE public.resource_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL UNIQUE, -- e.g. "Full Size Turf Field", "Hardwood Court", "Cage"
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Trigger for updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime schema extensions;
CREATE TRIGGER handle_resource_types_updated_at BEFORE UPDATE ON public.resource_types
    FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime('updated_at');

ALTER TABLE public.resource_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resource Types are viewable by everyone"
    ON public.resource_types FOR SELECT USING (true);

CREATE POLICY "Only Super/Master Admins can manage resource types"
    ON public.resource_types
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.system_role = 'super_admin' OR profiles.role = 'master_admin')
        )
    );

-- 3. Modify existing `resources` table to use `resource_type_id` instead of string `type`
ALTER TABLE public.resources ADD COLUMN resource_type_id UUID REFERENCES public.resource_types(id) ON DELETE RESTRICT;

-- Handle existing data (you might need to manually migrate or drop depending on the environment)
-- For now, we allow `type` to be null going forward to smooth the transition, but we'll try to drop it if possible, 
-- or at least drop the CHECK constraint.
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_type_check;
ALTER TABLE public.resources ALTER COLUMN type DROP NOT NULL;

-- 4. Create Junction Table: Facility <-> Activity Types (What a facility offers)
CREATE TABLE public.facility_activities (
    facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
    activity_type_id UUID REFERENCES public.activity_types(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (facility_id, activity_type_id)
);

ALTER TABLE public.facility_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Facility Activities are viewable by everyone."
    ON public.facility_activities FOR SELECT USING (true);

CREATE POLICY "Facility Admins can manage their activated activities."
    ON public.facility_activities
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.system_role = 'super_admin' OR 
                (profiles.system_role = 'facility_admin' AND profiles.facility_id = facility_activities.facility_id)
            )
        )
    );

-- 5. Create Junction Table: Resource <-> Activity Types (What activities can be played on this specific resource)
CREATE TABLE public.resource_activities (
    resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
    activity_type_id UUID REFERENCES public.activity_types(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (resource_id, activity_type_id)
);

ALTER TABLE public.resource_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resource Activities are viewable by everyone."
    ON public.resource_activities FOR SELECT USING (true);

CREATE POLICY "Facility Admins can manage their resource activities."
    ON public.resource_activities
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            JOIN public.resources ON resources.id = resource_activities.resource_id
            WHERE profiles.id = auth.uid()
            AND (
                profiles.system_role = 'super_admin' OR 
                (profiles.system_role = 'facility_admin' AND profiles.facility_id = resources.facility_id)
            )
        )
    );
