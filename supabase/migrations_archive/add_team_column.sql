-- Add team column to bookings table
ALTER TABLE bookings 
ADD COLUMN team text CHECK (team IN ('A', 'B'));
