'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';

export async function executeEscrowShortfalls(gameId: string) {
    try {
        const supabase = createAdminClient();

        // 1. Validate Game is a League and has a Team Roster Fee
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('id, title, is_league, team_roster_fee, deposit_amount')
            .eq('id', gameId)
            .single();

        if (gameError || !game) throw new Error("Game not found or error fetching game details.");
        if (!game.is_league) throw new Error("This action can only be run on Multi-Week Leagues.");
        if (!game.team_roster_fee || game.team_roster_fee <= 0) throw new Error("This league does not have a set Team Roster Fee.");

        const initialDeposit = game.deposit_amount || 0;

        // 2. Fetch all Active/Paid bookings for this league
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, user_id, team_assignment, stripe_payment_method_id, custom_invite_fee, payment_amount, status, payment_status, profiles!bookings_user_id_fkey(stripe_customer_id, full_name, email)')
            .eq('game_id', gameId)
            .neq('status', 'cancelled')
            .neq('roster_status', 'dropped');

        // Cast to any to bypass strict type checking on the dynamic profiles join
        const bookings = bookingsData as any[] || [];

        if (bookingsError) throw new Error("Error fetching bookings.");

        // Group by team
        const teams: Record<string, any[]> = {};
        bookings.forEach(b => {
            if (b.team_assignment) {
                if (!teams[b.team_assignment]) teams[b.team_assignment] = [];
                teams[b.team_assignment].push(b);
            }
        });

        let executedCount = 0;
        const failedCharges: string[] = [];

        for (const [teamName, roster] of Object.entries(teams)) {
            // Find Captain (The user with a vaulted payment method and a custom invite fee)
            const captain = roster.find(r => r.stripe_payment_method_id !== null);

            if (!captain) {
                console.warn(`[ESCROW] Skipping Team ${teamName} - No assigned captain with a vaulted card found.`);
                continue;
            }

            const customFeeStr = captain.custom_invite_fee || 0;

            // Calculate total team payments logically (Fallback to basic assumptions for now since tracking exact paymentIntent amounts per-user requires fetching from Stripe directly)
            // The captain paid the deposit.
            // The teammates paid the custom fee.
            
            // To be precise, let's just tally logic:
            const totalTeammates = roster.length - 1; // excluding captain
            const totalCollected = initialDeposit + (totalTeammates * customFeeStr);

            const balanceRemaining = game.team_roster_fee - totalCollected;

            if (balanceRemaining > 0) {
                // Shortfall! Charge the Captain.
                
                // Get customer ID
                const profileObj = captain.profiles as any;
                const profile = Array.isArray(profileObj) ? profileObj[0] : profileObj;
                const customerId = profile?.stripe_customer_id;

                if (!customerId || !captain.stripe_payment_method_id) {
                    failedCharges.push(`Team ${teamName}: Captain missing Stripe Customer or Payment Method references.`);
                    continue;
                }

                try {
                    // Create an off_session PaymentIntent
                    const paymentIntent = await stripe.paymentIntents.create({
                        amount: Math.round(balanceRemaining * 100), // cents
                        currency: 'usd',
                        customer: customerId,
                        payment_method: captain.stripe_payment_method_id,
                        off_session: true,
                        confirm: true,
                        description: `Escrow Shortfall: Team ${teamName} for ${game.title}`,
                        metadata: {
                            game_id: gameId,
                            team_assignment: teamName,
                            type: 'escrow_shortfall'
                        }
                    });

                    // We could log this as a standalone booking or receipt, but standard Stripe logic is fine for now.
                    executedCount++;
                    console.log(`[ESCROW CHARGED] Team ${teamName} Captain charged $${balanceRemaining}`);

                } catch (stripeErr: any) {
                    console.error(`[ESCROW STRIPE ERROR] Team ${teamName}:`, stripeErr);
                    failedCharges.push(`Team ${teamName}: ${stripeErr.message}`);
                }
            } else {
                console.log(`[ESCROW CLEAR] Team ${teamName} has fulfilled the total roster fee. (Collected: $${totalCollected})`);
            }
        }

        if (failedCharges.length > 0) {
             return { success: false, error: `Executed ${executedCount} shortfalls. Failed: ${failedCharges.join(' | ')}` };
        }

        return { success: true, message: `Successfully executed ${executedCount} escrow shortfalls.` };

    } catch (error: any) {
        console.error("Execute Escrow Shortfalls Error:", error);
        return { success: false, error: error.message };
    }
}
