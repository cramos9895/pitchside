-- Add recurring_group_id to resource_bookings
ALTER TABLE public.resource_bookings
ADD COLUMN IF NOT EXISTS recurring_group_id uuid;

-- Create an index to quickly fetch/delete all bookings in a recurring series
CREATE INDEX IF NOT EXISTS idx_resource_bookings_recurring_group 
ON public.resource_bookings(recurring_group_id);
