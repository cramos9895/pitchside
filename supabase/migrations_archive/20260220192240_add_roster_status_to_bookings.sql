ALTER TABLE bookings ADD COLUMN IF NOT EXISTS roster_status TEXT CHECK (roster_status IN (confirmed, waitlisted, dropped)) DEFAULT confirmed;
