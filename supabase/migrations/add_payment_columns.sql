-- Add payment tracking columns to bookings table
alter table bookings
add column if not exists payment_status text check (payment_status in ('unpaid', 'pending', 'verified', 'refunded')) default 'unpaid',
add column if not exists payment_method text,
add column if not exists payment_amount numeric default 0;

-- Backfill existing paid bookings as verified
update bookings 
set payment_status = 'verified', payment_amount = (select price from games where games.id = bookings.game_id)
where status = 'paid';

-- Ensure pending manual comparisons don't fail RLS or other checks (handled in previous fix)
