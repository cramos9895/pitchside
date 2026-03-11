'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';

export async function cancelPlayerRegistration(bookingId: string) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new Error('You must be logged in to cancel your registration.');
        }

        const adminSupabase = createAdminClient();

        // 1. Fetch Booking and Game Details
        const { data: booking, error: bookingError } = await adminSupabase
            .from('bookings')
            .select(`
                id, 
                status, 
                user_id, 
                stripe_payment_intent_id, 
                payment_status, 
                game_id,
                games (
                    is_refundable,
                    refund_cutoff_date
                )
            `)
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            throw new Error('Booking not found.');
        }

        if (booking.user_id !== user.id) {
            throw new Error('You can only cancel your own registrations.');
        }

        if (booking.status === 'cancelled') {
            return { success: true, message: 'This registration is already cancelled.' };
        }

        const game = Array.isArray(booking.games) ? booking.games[0] : booking.games;

        // 2. Scenario A: Free Agent Pending (Vaulted Card, No Charge Yet)
        if (booking.status === 'free_agent_pending') {
            const { error: cancelError } = await adminSupabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', booking.id);

            if (cancelError) throw new Error('Failed to withdraw from the Free Agent pool.');
            return { success: true, message: 'You have been removed from the draft pool. No charges were made.' };
        }

        // 3. Scenario B: Waitlist (No financial transaction assumed yet)
        if (booking.status === 'waitlist' || booking.status === 'waitlisted') {
            const { error: cancelError } = await adminSupabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', booking.id);
            if (cancelError) throw new Error('Failed to leave the waitlist.');
            return { success: true, message: 'You have left the waitlist.' };
        }

        // 4. Scenario C: Confirmed/Paid and Requires Contextual Refund Logic
        if (booking.status === 'paid' || booking.status === 'confirmed' || booking.status === 'active') {

            let isRefundEligible = game?.is_refundable;
            
            // Check Refund Cutoff Date specifically
            if (isRefundEligible && game?.refund_cutoff_date) {
                const cutoff = new Date(game.refund_cutoff_date);
                if (new Date() > cutoff) {
                    isRefundEligible = false; // Block it
                }
            }

            // Check if Game Allows Refunds
            if (isRefundEligible) {
                // Determine if we need to call Stripe
                if (booking.stripe_payment_intent_id && booking.payment_status === 'verified') {
                    try {
                        const refund = await stripe.refunds.create({
                            payment_intent: booking.stripe_payment_intent_id,
                            reason: 'requested_by_customer'
                        });

                        if (refund.status !== 'succeeded' && refund.status !== 'pending') {
                            throw new Error(`Stripe Refund Failed: ${refund.status}`);
                        }
                    } catch (stripeErr: any) {
                        console.error('Stripe Refund Error:', stripeErr);
                        throw new Error(`Could not process your refund. Please contact support. Error: ${stripeErr.message}`);
                    }
                }

                // Update Database
                const { error: cancelError } = await adminSupabase
                    .from('bookings')
                    .update({
                        status: 'cancelled',
                        payment_status: 'refunded'
                    })
                    .eq('id', booking.id);

                if (cancelError) throw new Error('Failed to cancel the booking in our system.');
                return { success: true, message: 'Registration cancelled and refund initiated successfully.' };

            } else {
                // Game does NOT allow refunds or cutoff has passed
                const { error: noRefundError } = await adminSupabase
                    .from('bookings')
                    .update({ status: 'cancelled' })
                    .eq('id', booking.id);

                if (noRefundError) throw new Error('Failed to cancel the booking.');

                const cutoffMessage = game?.refund_cutoff_date && new Date() > new Date(game.refund_cutoff_date) 
                    ? 'Registration cancelled. The refund cutoff date has passed, so no refund will be issued.' 
                    : 'Registration cancelled. Per the event policy, no refund will be issued.';

                return { success: true, message: cutoffMessage };
            }
        }

        // Catch-all
        return { success: false, error: 'Unknown booking status.' };

    } catch (err: any) {
        console.error('Cancel Action Error:', err);
        return { success: false, error: err.message || 'Action Failed' };
    }
}
