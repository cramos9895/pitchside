ALTER TABLE resource_bookings ADD COLUMN is_listed boolean DEFAULT false;
ALTER TABLE resource_bookings ADD COLUMN listing_price numeric;
ALTER TABLE resource_bookings ADD COLUMN marketplace_status text DEFAULT 'none';
