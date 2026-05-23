-- Create payment status enum
CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'verified', 'refunded');

-- Alter bookings table
ALTER TABLE bookings 
ADD COLUMN payment_status payment_status NOT NULL DEFAULT 'unpaid',
ADD COLUMN payment_method TEXT,
ADD COLUMN payment_amount NUMERIC DEFAULT 0;

--  Insert default system settings for payment if they don't exist
--  Note: verification that system_settings table exists should be done, but assuming it does from previous context
INSERT INTO system_settings (key, value, description)
VALUES 
    ('payment.venmo_handle', 'PitchSideCF', 'Venmo handle for manual payments'),
    ('payment.zelle_info', '555-0199', 'Phone number or email for Zelle payments')
ON CONFLICT (key) DO NOTHING;
