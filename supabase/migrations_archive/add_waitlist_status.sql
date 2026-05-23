-- Update bookings status check to include active, waitlist, cancelled
ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'paid', 'active', 'waitlist', 'cancelled'));
