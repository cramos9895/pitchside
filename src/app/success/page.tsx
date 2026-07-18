
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/email';
import { CheckCircle2, AlertCircle } from 'lucide-react';


interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SuccessPage({ searchParams }: Props) {
    const params = await searchParams;
    const isBypassed = params.bypassed === 'true';

    if (isBypassed) {
        return (
            <div className="min-h-screen bg-pitch-black flex flex-col items-center justify-center text-white px-4">
                <div className="bg-pitch-card border border-white/10 p-8 rounded-sm max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-pitch-accent" />

                    <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 bg-pitch-accent/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-pitch-accent" />
                        </div>
                    </div>

                    <h1 className="font-heading text-4xl font-bold italic uppercase tracking-tighter mb-2">
                        You're In!
                    </h1>
                    <p className="text-pitch-secondary mb-8">
                        Your spot on the roster is confirmed.
                    </p>

                    <Link
                        href="/"
                        className="inline-block w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors"
                    >
                        Back to Pitch
                    </Link>
                </div>
            </div>
        );
    }

    const sessionId = params.session_id;

    if (!sessionId || typeof sessionId !== 'string') {
        return (
            <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Invalid Session</h1>
                    <Link href="/" className="text-pitch-accent hover:underline">Return Home</Link>
                </div>
            </div>
        );
    }

    try {
        // 1. Retrieve session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.mode === 'setup') {
            if (session.status !== 'complete') {
                return (
                    <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">
                        <div className="text-center">
                            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold mb-2">Vaulting Not Completed</h1>
                            <Link href="/" className="text-pitch-accent hover:underline">Return Home</Link>
                        </div>
                    </div>
                );
            }
        } else {
            if (session.payment_status !== 'paid') {
                return (
                    <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">
                        <div className="text-center">
                            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold mb-2">Payment Not Completed</h1>
                            <Link href="/" className="text-pitch-accent hover:underline">Return Home</Link>
                        </div>
                    </div>
                );
            }
        }

        const gameId = session.metadata?.game_id;
        const userId = session.metadata?.user_id;
        const note = session.metadata?.note;
        const isFreeAgent = session.metadata?.is_free_agent === 'true';
        const isLeagueCaptain = session.metadata?.is_league_captain === 'true';
        const isWaitlistVaulting = session.metadata?.is_waitlist_vaulting === 'true';
        const teamAssignment = session.metadata?.team_assignment || null;
        const prizeSplitPreference = session.metadata?.prize_split_preference;
        const teamId = session.metadata?.team_id;
        const eventType = session.metadata?.type;
        const registrationId = session.metadata?.registration_id;

        if (!gameId || !userId) {
            throw new Error("Missing metadata in Stripe session");
        }

        const supabase = await createClient();
        const adminSupabase = createAdminClient();

        // If Vault Session: Extract SetupIntent to get the Payment Method ID
        let paymentMethodId = null;
        if (session.mode === 'setup' && session.setup_intent) {
            const setupIntentId = typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent.id;
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
            paymentMethodId = typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method?.id;

            // Optional: Save the Stripe Customer ID to Profile if it was newly created
            if (session.customer) {
                const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
                await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
            }
        } else if (session.mode === 'payment' && session.payment_intent && isLeagueCaptain) {
            // Vaulting during a deposit charge
            const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            paymentMethodId = typeof paymentIntent.payment_method === 'string' ? paymentIntent.payment_method : paymentIntent.payment_method?.id;

            if (session.customer) {
                const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
                await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
            }
        }

        // 2. Fetch Staged Pending Checkout
        const { data: pendingCheckout } = await supabase
            .from('pending_checkouts')
            .select('*')
            .eq('checkout_session_id', sessionId)
            .maybeSingle();

        // 2.5 (Removed) Tournament Registration update moved to the passengers loop below

        let appliedCreditUnitsCents = 0;
        let guestIdsToInsert: string[] = [];

        if (pendingCheckout) {
            appliedCreditUnitsCents = pendingCheckout.credit_used || pendingCheckout.applied_credit || 0;
            if (pendingCheckout.guest_ids && Array.isArray(pendingCheckout.guest_ids)) {
                guestIdsToInsert = pendingCheckout.guest_ids;
            }
        } else {
            console.warn(`[SUCCESS_WARNING] pending_checkout missing for session ${sessionId}. Falling back to Stripe metadata.`);
            appliedCreditUnitsCents = Math.round(parseFloat(session.metadata?.appliedCreditUnits || '0') * 100);
            const metaGuests = session.metadata?.guestIds;
            if (metaGuests && metaGuests.trim().length > 0) {
                guestIdsToInsert = metaGuests.split(',');
            }
        }

        // 3. Process Bookings for all Users involved (Check-Then-Update Pattern)
        const linkedBookingId = crypto.randomUUID();
        const baseAmount = (session.amount_total || 0) / 100;
        
        const passengersToProcess: any[] = [
            {
                game_id: gameId,
                user_id: userId,
                buyer_id: null,
                linked_booking_id: linkedBookingId,
                status: isWaitlistVaulting ? 'waitlist' : 'paid',
                payment_status: isWaitlistVaulting ? 'unpaid' : 'verified',
                payment_method: isWaitlistVaulting ? 'vaulted' : 'stripe',
                payment_amount: baseAmount,
                roster_status: isWaitlistVaulting ? 'waitlisted' : 'confirmed',
                note: note,
                stripe_payment_method_id: paymentMethodId,
                ...(teamAssignment && { team_assignment: teamAssignment }),
                ...(prizeSplitPreference && { prize_split_preference: prizeSplitPreference })
            }
        ];

        for (const gid of guestIdsToInsert) {
            passengersToProcess.push({
                game_id: gameId,
                user_id: gid,
                buyer_id: userId,
                linked_booking_id: linkedBookingId,
                status: isWaitlistVaulting ? 'waitlist' : 'paid',
                payment_status: isWaitlistVaulting ? 'unpaid' : 'verified',
                payment_method: isWaitlistVaulting ? 'vaulted' : 'stripe',
                payment_amount: baseAmount,
                roster_status: isWaitlistVaulting ? 'waitlisted' : 'confirmed',
                stripe_payment_method_id: paymentMethodId,
                ...(teamAssignment && { team_assignment: teamAssignment })
            });
        }

        let atLeastOneSuccess = false;

        for (const passenger of passengersToProcess) {
            try {
                // FALLBACK RESILIENCY: Use standard auth client for the buyer's own booking
                // This prevents checkout failures if the admin service key on Vercel is misconfigured
                const dbClient = passenger.user_id === userId ? supabase : adminSupabase;

                // Check if passenger already has a booking row that was possibly cancelled
                const { data: existingBooking } = await dbClient
                    .from('bookings')
                    .select('id')
                    .eq('game_id', passenger.game_id)
                    .eq('user_id', passenger.user_id)
                    .maybeSingle();

                if (existingBooking) {
                    // UPSERT: Update their cancelled row back to active
                    const { error: updateError } = await dbClient
                        .from('bookings')
                        .update({
                            status: passenger.status,
                            payment_status: passenger.payment_status,
                            roster_status: passenger.roster_status,
                            stripe_payment_method_id: passenger.stripe_payment_method_id || null,
                            team_assignment: passenger.team_assignment || null,
                            note: passenger.note || null,
                            payment_amount: passenger.payment_amount
                        })
                        .eq('id', existingBooking.id);

                    if (updateError) {
                        console.error(`[SUCCESS_FAIL] Update failed for user ${passenger.user_id}:`, updateError);
                    } else {
                        atLeastOneSuccess = true;
                    }
                } else {
                    // INSERT new row
                    const { error: insertError } = await dbClient
                        .from('bookings')
                        .insert([passenger]);

                    if (insertError) {
                        console.error(`[SUCCESS_FAIL] Insert failed for user ${passenger.user_id}:`, insertError);
                    } else {
                        atLeastOneSuccess = true;
                    }
                }

                // If Tournament or League, also update their pending tournament_registrations row
                if (eventType === 'tournament' || eventType === 'league') {
                    const { error: regError } = await adminSupabase
                        .from('tournament_registrations')
                        .update({
                            status: 'registered',
                            payment_status: 'paid',
                            stripe_payment_intent_id: session.payment_intent || (session.setup_intent ? typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent.id : null)
                        })
                        .eq('game_id', passenger.game_id)
                        .eq('user_id', passenger.user_id);
                    
                    if (regError) {
                        console.error(`[SUCCESS_DB_ERROR] Failed to finalize tournament registration for user ${passenger.user_id}:`, regError);
                    }
                }
            } catch (err) {
                console.error(`[SUCCESS_FAIL] Exception while processing user ${passenger.user_id}:`, err);
            }
        }

        // Deduct Wallet Balance from buyer only if we actually processed the transaction from pending_checkouts
        if (pendingCheckout && appliedCreditUnitsCents > 0) {
             const { data: profile } = await adminSupabase.from('profiles').select('credit_balance').eq('id', userId).single();
             if (profile && profile.credit_balance !== undefined) {
                 const newBalance = Math.max(0, profile.credit_balance - appliedCreditUnitsCents);
                 await adminSupabase.from('profiles').update({ credit_balance: newBalance }).eq('id', userId);
             }
        }

        // Cleanup pending checkout regardless
        if (pendingCheckout) {
            await adminSupabase.from('pending_checkouts').delete().eq('checkout_session_id', sessionId);
        }

        
        if (atLeastOneSuccess) {
            try {
                // Fetch profile and game for email
                const { data: profile } = await supabase.from('profiles').select('email, first_name, last_name').eq('id', userId).single();
                const { data: game } = await supabase.from('games').select('title, start_time, location, view_mode, price').eq('id', gameId).single();

                if (profile?.email && game) {
                    await sendNotification({
                        to: profile.email,
                        subject: `Booking Confirmed: ${game.title}`,
                        type: 'confirmation',
                        data: {
                            userName: profile.first_name ? `${profile.first_name} ${profile.last_name}` : profile.email.split('@')[0] || 'Player',
                            gameTitle: game.title,
                            gameDate: new Date(game.start_time).toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
                            gameTime: new Date(game.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Chicago' }),
                            location: game.location || 'TBD',
                            mode: game.view_mode || 'Single Match',
                            amountCharged: (session.amount_total || 0) > 0 ? `$${((session.amount_total || 0) / 100).toFixed(2)}` : 'Free'
                        }
                    });
                }
            } catch (emailErr) {
                console.error('[SUCCESS_EMAIL_FAIL]', emailErr);
            }
        }


        if (atLeastOneSuccess && teamAssignment && session.payment_intent && typeof session.payment_intent === 'string') {
                // Phase 43: Split Payments Auto-Refund Overage
                const { data: gameData } = await supabase
                    .from('games')
                    .select('is_league, team_roster_fee')
                    .eq('id', gameId)
                    .single();

                if (gameData?.is_league && gameData.team_roster_fee && gameData.team_roster_fee > 0) {
                    // Fetch all teammates who have paid (excluding dropped/cancelled)
                    const { data: teamBookings } = await supabase
                        .from('bookings')
                        .select('user_id')
                        .eq('game_id', gameId)
                        .eq('team_assignment', teamAssignment)
                        .in('status', ['paid', 'active'])
                        .neq('roster_status', 'dropped');

                    if (teamBookings) {
                        const totalPlayers = teamBookings.length;
                        // For simplicity in this iteration, we assume all players paying via stripe paid the custom_invite_fee.
                        // Ideally, we'd query the actual Stripe PaymentIntents or store the individual paid amount in `bookings`.
                        // But since we just captured `session.amount_total`, let's use that to approximate the final team total.
                        // Actually, a more robust way: If (totalPlayers * custom_fee) > team_roster_fee, refund the difference.
                        // Let's assume the user just paid `session.amount_total` (in cents).
                        
                        // We need the captain's deposit and fee
                        const { data: captainBooking } = await supabase
                            .from('bookings')
                            .select('custom_invite_fee')
                            .eq('game_id', gameId)
                            .eq('team_assignment', teamAssignment)
                            .not('stripe_payment_method_id', 'is', null)
                            .maybeSingle();

                        if (captainBooking && captainBooking.custom_invite_fee) {
                            const assumedDeposit = gameData.team_roster_fee * 0.2; // Temporary: Need a deposit column or assumption. We added deposit_amount to games! Let's re-query.
                            
                            const { data: fullGame } = await supabase.from('games').select('deposit_amount, team_roster_fee').eq('id', gameId).single();
                            
                            const actualDeposit = fullGame?.deposit_amount || 0;
                            const inviteFee = captainBooking.custom_invite_fee;
                            
                            // Captain paid deposit.
                            // The rest paid the invite fee. (Total players - 1) * inviteFee
                            const totalCollected = actualDeposit + ((totalPlayers - 1) * inviteFee);
                            
                            if (totalCollected > fullGame!.team_roster_fee) {
                                const overage = totalCollected - fullGame!.team_roster_fee;
                                
                                // Make sure we don't refund more than this specific user just paid
                                const refundAmount = Math.min(overage, (session.amount_total || 0) / 100);
                                
                                if (refundAmount > 0) {
                                    console.log(`[ESCROW REFUND] Team ${teamAssignment} over-collected by $${overage}. Refunding $${refundAmount} to user ${userId}`);
                                    try {
                                        await stripe.refunds.create({
                                            payment_intent: session.payment_intent,
                                            amount: Math.round(refundAmount * 100) // in cents
                                        });
                                    } catch (refundError) {
                                        console.error('Failed to issue escrow refund:', refundError);
                                    }
                                }
                            }
                        }
                    }
                }
            }

        return (
            <div className="min-h-screen bg-pitch-black flex flex-col items-center justify-center text-white px-4">
                <div className="bg-pitch-card border border-white/10 p-8 rounded-sm max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-pitch-accent" />

                    <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 bg-pitch-accent/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-pitch-accent" />
                        </div>
                    </div>

                    <h1 className="font-heading text-4xl font-bold italic uppercase tracking-tighter mb-2">
                        {isWaitlistVaulting ? "You're on the Waitlist!" : "You're In!"}
                    </h1>
                    <p className="text-pitch-secondary mb-8">
                        {isWaitlistVaulting 
                            ? "Your card has been saved securely, but you have NOT been charged. You will only be charged if a spot opens up and you are promoted to the active roster."
                            : "Payment successful. Your spot on the roster is confirmed."}
                    </p>

                    <Link
                        href={
                            eventType === 'league' 
                                ? (teamId ? `/leagues/${gameId}/team/${teamId}` : '/dashboard/schedule')
                                : '/'
                        }
                        className="inline-block w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors"
                    >
                        {eventType === 'league' ? 'Go to Command Center' : 'Back to Pitch'}
                    </Link>
                </div>
            </div>
        );

    } catch (err) {
        console.error("Success Page Error:", err);
        return (
            <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                    <p className="text-gray-400 mb-4">Please contact support with your Session ID: {sessionId.slice(-8)}</p>
                    <Link href="/" className="text-pitch-accent hover:underline">Return Home</Link>
                </div>
            </div>
        );
    }
}
