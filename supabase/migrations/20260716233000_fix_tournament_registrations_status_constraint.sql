-- Migration: Fix tournament_registrations status constraint on production
-- The production constraint was missing 'pending' which is required for the
-- Stripe payment flow (registrations start as 'pending' and are confirmed after payment).
-- This caused a 500 error any time a user tried to register for a paid tournament.

-- Drop the existing constraint
ALTER TABLE tournament_registrations 
    DROP CONSTRAINT IF EXISTS tournament_registrations_status_check;

-- Re-add it with 'pending' included
ALTER TABLE tournament_registrations 
    ADD CONSTRAINT tournament_registrations_status_check 
    CHECK (status = ANY (ARRAY[
        'pending'::text, 
        'registered'::text, 
        'drafted'::text, 
        'waitlisted'::text, 
        'cancelled'::text
    ]));
