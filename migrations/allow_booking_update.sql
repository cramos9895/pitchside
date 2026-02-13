
-- Allow users to update their own bookings (e.g. to cancel)
CREATE POLICY "Users can update own bookings" ON bookings
FOR UPDATE
USING (auth.uid() = user_id);
