-- Add slug to facilities for public routing
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Auto-generate slugs for existing facilities based on their name
UPDATE public.facilities 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Make slug required for future facilities
ALTER TABLE public.facilities ALTER COLUMN slug SET NOT NULL;

-- Add user_id and contact_email to resource_bookings for public requests
ALTER TABLE public.resource_bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.resource_bookings ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Update RLS to allow authenticated users to INSERT a pending booking request
-- (They can only insert if it's pending, and they can only insert for themselves)
CREATE POLICY "Authenticated users can request bookings"
ON public.resource_bookings
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id 
    AND status = 'pending_facility_review'
);

-- Note: The existing "Anyone can view resource_bookings" FOR SELECT policy 
-- already allows the public calendar to fetch these events for display.
