-- Add has_physical_waiver column to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS has_physical_waiver BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.bookings.has_physical_waiver IS 'Flag set by admins to override missing digital waivers with a physical/paper one.';
