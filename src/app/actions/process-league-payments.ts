'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedProfile, validateGameAuthority } from '@/lib/auth-guards';

export async function processLeaguePayments(leagueId: string) {
    try {
        const profile = await getAuthenticatedProfile();
        await validateGameAuthority(profile, leagueId);

        const supabase = createAdminClient();

        // 1. Fetch League details to get price and verification
        const { data: league, error: leagueError } = await supabase
            .from('games')
            .select('*')
            .eq('id', leagueId)
            .single();

        if (leagueError || !league) {
            throw new Error(`League not found: ${leagueId}`);
        }

        // 2. Fetch all registrations that need charging
        const { data: registrations, error: regError } = await supabase
            .from('tournament_registrations')
            .select('*, teams(*)')
            .eq('game_id', leagueId)
            .eq('payment_status', 'card_saved');

        if (regError) {
            throw new Error(`Error fetching registrations: ${regError.message}`);
        }

        if (!registrations || registrations.length === 0) {
            return { success: true, message: 'No pending payments to process.' };
        }

        const results = [];

        // 3. Process each registration with Loop Resilience
        for (const reg of registrations) {
            try {
                if (!reg.payment_intent_id) {
                    throw new Error(`Missing payment_intent_id (SetupIntent) for registration ${reg.id}`);
                }

                // A. Retrieve SetupIntent to get customer and payment_method
                const setupIntent = await stripe.setupIntents.retrieve(reg.payment_intent_id);
                
                if (!setupIntent.customer || !setupIntent.payment_method) {
                    throw new Error(`SetupIntent ${reg.payment_intent_id} is missing customer or payment_method`);
                }

                const customerId = typeof setupIntent.customer === 'string' ? setupIntent.customer : setupIntent.customer.id;
                const paymentMethodId = typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method.id;

                // B. Calculate Amount (Simplified team split logic)
                // In a production app, this would be more complex based on team size vs league price
                // For this implementation, we'll assume the registration already has a 'price_at_registration' if applicable
                // or we use the league's team_price / roster_size.
                const totalAmountCents = reg.amount_due_cents || (league.team_price ? Math.round(league.team_price * 100) : 0);
                
                if (totalAmountCents <= 0) {
                    // Update to paid and skip if free
                    await supabase
                        .from('tournament_registrations')
                        .update({ payment_status: 'paid' })
                        .eq('id', reg.id);
                    results.push({ id: reg.id, status: 'skipped', reason: 'Zero amount' });
                    continue;
                }

                // C. Create and Confirm PaymentIntent (Off-Session)
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: totalAmountCents,
                    currency: 'usd',
                    customer: customerId,
                    payment_method: paymentMethodId,
                    off_session: true,
                    confirm: true,
                    description: `League Payment: ${league.title}`,
                    metadata: {
                        registration_id: reg.id,
                        league_id: league.id
                    }
                });

                if (paymentIntent.status === 'succeeded') {
                    // D. Update Database on Success
                    await supabase
                        .from('tournament_registrations')
                        .update({ 
                            payment_status: 'paid',
                            stripe_payment_intent_id: paymentIntent.id
                        })
                        .eq('id', reg.id);
                    
                    results.push({ id: reg.id, status: 'success' });
                } else {
                    throw new Error(`PaymentIntent status: ${paymentIntent.status}`);
                }

            } catch (err: any) {
                console.error(`[LEAGUE_PAYMENT_FAILURE] Reg ID: ${reg.id}`, err.message);
                
                // Update specific row to failed
                await supabase
                    .from('tournament_registrations')
                    .update({ 
                        payment_status: 'failed',
                        payment_error: err.message
                    })
                    .eq('id', reg.id);

                results.push({ id: reg.id, status: 'failed', error: err.message });
            }
        }

        revalidatePath(`/admin/leagues/${leagueId}`);
        return { 
            success: true, 
            results,
            summary: {
                total: registrations.length,
                success: results.filter(r => r.status === 'success').length,
                failed: results.filter(r => r.status === 'failed').length
            }
        };

    } catch (error: any) {
        console.error('[PROCESS_LEAGUE_PAYMENTS_CRITICAL_ERROR]', error.message);
        return { success: false, error: error.message };
    }
}
