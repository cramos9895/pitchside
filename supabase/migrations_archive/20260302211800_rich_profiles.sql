-- Migration for Phase 21.5: Rich Profiles & The Marketplace Browser
-- Adding rich profile fields to the facilities table for the public index

ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS public_description TEXT;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- We don't need any new RLS policies for this right now, as the Facility Admins 
-- already have an UPDATE policy on their own facilities record, and the 
-- system_role = 'super_admin' / role = 'master_admin' has full UPDATE access.
-- The public SELECT policy already exists to allow the Index Route to read these columns.
