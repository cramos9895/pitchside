'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';

export async function buildHouseTeam(gameId: string) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new Error('You must be logged in to build a house team.');
        }

        const adminSupabase = createAdminClient();

        // 1. Verify Master Admin / Admin
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || !['admin', 'master_admin'].includes(profile.role)) {
            throw new Error('Only administrators can build House Teams.');
        }

        // 2. Fetch the Game
        const { data: game, error: gameError } = await adminSupabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            throw new Error('Game not found.');
        }

        // 3. Fetch all pending free agents
        const { data: freeAgents, error: faError } = await adminSupabase
            .from('bookings')
            .select('*, profiles:user_id(stripe_customer_id, full_name, email)')
            .eq('game_id', gameId)
            .eq('status', 'free_agent_pending');

        if (faError || !freeAgents || freeAgents.length === 0) {
            return { success: false, error: 'No pending free agents found to build a team.' };
        }

        // 4. Create a New Team Config
        const currentTeams = game.teams_config || [];
        const newTeamNumber = currentTeams.length + 1;
        const newTeamColor = getNextTeamColor(newTeamNumber); // simple helper

        const newTeamConfig = {
            name: `House Team ${newTeamNumber}`,
            color: newTeamColor,
            limit: game.max_players ? Math.ceil(game.max_players / 2) : 10 // rough estimate for pickup
        };

        const updatedTeamsConfig = [...currentTeams, newTeamConfig];

        // 5. Save the new config to DB
        const { error: gameUpdateError } = await adminSupabase
            .from('games')
            .update({ teams_config: updatedTeamsConfig })
            .eq('id', gameId);

        if (gameUpdateError) {
            throw new Error('Failed to create the new House Team configuration.');
        }

        // 6. Loop through Free Agents to Charge & Roster
        const results = {
            successful: 0,
            failed: 0,
            failures: [] as string[]
        };

        for (const fa of freeAgents) {
            const customerId = Array.isArray(fa.profiles) ? fa.profiles[0]?.stripe_customer_id : fa.profiles?.stripe_customer_id;
            const faName = Array.isArray(fa.profiles) ? fa.profiles[0]?.full_name : fa.profiles?.full_name;
            const paymentMethodId = fa.stripe_payment_method_id;

            if (!customerId || !paymentMethodId) {
                results.failed++;
                results.failures.push(`${faName} missing vault credentials.`);
                continue;
            }

            try {
                // Charge Card Off-Session
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(game.price * 100),
                    currency: 'usd',
                    customer: customerId,
                    payment_method: paymentMethodId,
                    off_session: true,
                    confirm: true,
                    description: `Drafted to ${newTeamConfig.name} for ${game.title}`,
                    metadata: {
                        game_id: gameId,
                        user_id: fa.user_id,
                        type: 'house_team_auto_draft'
                    }
                });

                if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
                    // Update Booking
                    await adminSupabase
                        .from('bookings')
                        .update({
                            status: 'paid',
                            team_assignment: newTeamNumber
                        })
                        .eq('id', fa.id);
                    results.successful++;
                } else {
                    results.failed++;
                    results.failures.push(`${faName} card declined (${paymentIntent.status})`);
                }

            } catch (stripeError: any) {
                console.error(`Stripe Error for FA ${fa.id}:`, stripeError);
                results.failed++;
                results.failures.push(`${faName} charge failed: ${stripeError.message}`);
            }
        }

        return {
            success: true,
            message: `House Team built! Details: ${results.successful} drafted successfully, ${results.failed} failed.`,
            details: results
        };

    } catch (err: any) {
        console.error('House Team Action Error:', err);
        return { success: false, error: err.message || 'Action Failed' };
    }
}

// Helper for generating cyclic colors for new teams
function getNextTeamColor(teamNumber: number) {
    const defaultColors = ['#ff4444', '#4444ff', '#44ff44', '#ffff44', '#ff44ff', '#44ffff', '#ffffff', '#000000'];
    return defaultColors[(teamNumber - 1) % defaultColors.length];
}
