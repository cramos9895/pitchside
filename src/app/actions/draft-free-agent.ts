'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { getAuthenticatedProfile, validateCaptaincy } from '@/lib/auth-guards';

export async function draftFreeAgent(bookingId: string, teamAssignment: string) {
    try {
        const profile = await getAuthenticatedProfile();
        
        const adminSupabase = createAdminClient();

        // 1. Fetch the Booking & The Game early to find the team_id
        const { data: booking, error: bookingError } = await adminSupabase
            .from('bookings')
            .select('*, game_id, user_id, status, stripe_payment_method_id, profiles:user_id(stripe_customer_id, full_name, email)')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            throw new Error('Free Agent booking not found.');
        }

        // 2. Identify the Team Context for Captaincy Verification
        // Note: teamAssignment in PitchSide is usually a string (team name). 
        // We need the team_id to verify captaincy.
        const { data: team } = await adminSupabase
            .from('teams')
            .select('id')
            .eq('game_id', booking.game_id)
            .eq('name', teamAssignment)
            .single();

        if (!team) throw new Error('Target team not found.');

        // 3. Mandatory Security Guard
        await validateCaptaincy(profile.id, team.id);

        if (booking.status !== 'free_agent_pending') {
            throw new Error('This player is no longer available in the Free Agent pool.');
        }

        const { data: game, error: gameError } = await adminSupabase
            .from('games')
            .select('price, max_players, title')
            .eq('id', booking.game_id)
            .single();

        if (gameError || !game) {
            throw new Error('Associated game not found.');
        }

        // --- ENFORCER: SQUAD CAPACITY CHECK ---
        const { data: fullGameConfig } = await adminSupabase
            .from('games')
            .select('teams_config')
            .eq('id', booking.game_id)
            .single();

        if (fullGameConfig?.teams_config && Array.isArray(fullGameConfig.teams_config)) {
            const teamConfig = fullGameConfig.teams_config.find((t: any) => t.name === teamAssignment);

            if (teamConfig && teamConfig.limit && teamConfig.limit > 0) {
                const maxPerTeam = teamConfig.limit;

                const { count } = await adminSupabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('game_id', booking.game_id)
                    .neq('status', 'cancelled')
                    .eq('team_assignment', teamAssignment);

                if (count !== null && count >= maxPerTeam) {
                    throw new Error('Your squad is full. You cannot draft any more players.');
                }
            }
        }
        // --------------------------------------

        // 2. Extract Stripe Vault Credentials
        const customerId = Array.isArray(booking.profiles) ? booking.profiles[0]?.stripe_customer_id : booking.profiles?.stripe_customer_id;
        const paymentMethodId = booking.stripe_payment_method_id;

        if (!customerId || !paymentMethodId) {
            throw new Error('This player is missing vaulted Stripe credentials. They must re-register.');
        }

        // 3. Execute Off-Session Charge
        let paymentIntent;
        try {
            paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(game.price * 100),
                currency: 'usd',
                customer: customerId,
                payment_method: paymentMethodId,
                off_session: true,
                confirm: true,
                description: `Drafted to Squad ${teamAssignment} for ${game.title}`,
                metadata: {
                    game_id: booking.game_id,
                    user_id: booking.user_id,
                    type: 'free_agent_draft'
                }
            });
        } catch (stripeError: any) {
            console.error('Stripe Off-Session Decline:', stripeError);
            throw new Error(`The player's vaulted card was declined. They cannot be drafted. (${stripeError.message})`);
        }

        // 4. If successful, officially roster the player
        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
            const { error: updateError } = await adminSupabase
                .from('bookings')
                .update({
                    status: 'paid', // Active roster
                    team_assignment: teamAssignment,
                    // Optional: You could write the new payment_intent id back if you wanted
                })
                .eq('id', booking.id);

            if (updateError) {
                console.error('Failed to update booking post-draft:', updateError);
                throw new Error('Payment succeeded but we failed to verify the roster spot. Please contact support.');
            }

            // 5. Success! Return true so the UI can update
            const { revalidatePath } = require('next/cache');
            revalidatePath('/free-agents');
            revalidatePath('/dashboard');
            
            return { success: true, message: 'Draft Successful and Card Charged!' };
        } else {
            throw new Error(`Payment failed with status: ${paymentIntent.status}`);
        }

    } catch (err: any) {
        console.error('Draft Action Error:', err);
        return { success: false, error: err.message || 'Draft Action Failed' };
    }
}
