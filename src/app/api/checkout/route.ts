// 🏗️ Architecture: [[GameCard.md]]

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRateLimited } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
    try {
        const { gameId, userId, price = 10.00, title = 'Pickup Soccer Game', note = '', promoCodeId, teamAssignment, isFreeAgent, isLeagueCaptainVaulting, guestIds = [] } = await request.json();

        // --- SECURITY: RATE LIMITING ---
        // Checkout is an authenticated action, so we limit by User ID
        const isLimited = await isRateLimited(userId, 'api:checkout', 5, 60);
        if (isLimited) {
            return NextResponse.json({ 
                error: "Too many checkout attempts. Please wait 60 seconds before trying again." 
            }, { status: 429 });
        }
        // -------------------------------

        const origin = request.headers.get('origin') || 'http://localhost:3000';
        const adminSupabase = createAdminClient();

        // 0. GLOBAL CAPACITY CHECK
        const partySize = 1 + (guestIds?.length || 0);

        // Fetch Global Game Config
        const { data: gameConfig } = await adminSupabase
            .from('games')
            .select('max_players, teams_config, price')
            .eq('id', gameId)
            .single();

        if (gameConfig && gameConfig.max_players !== null) {
            const { count: currentRosterSize } = await adminSupabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('game_id', gameId)
                .in('status', ['paid', 'active'])
                .neq('roster_status', 'dropped');

            if (currentRosterSize !== null && (currentRosterSize + partySize > gameConfig.max_players)) {
                return NextResponse.json({ error: `Not enough capacity! Only ${gameConfig.max_players - currentRosterSize} spots remain.` }, { status: 400 });
            }
        }

        // --- ENFORCER: SQUAD CAPACITY CHECK ---
        if (teamAssignment !== undefined && teamAssignment !== null) {
            if (gameConfig && gameConfig.teams_config && Array.isArray(gameConfig.teams_config)) {
                const teamConfig = gameConfig.teams_config.find((t: any) => t.name === teamAssignment);

                if (teamConfig && teamConfig.limit && teamConfig.limit > 0) {
                    const maxPerTeam = teamConfig.limit;

                    // 2. Get Current Team Roster Size
                    const { count: teamCount } = await adminSupabase
                        .from('bookings')
                        .select('*', { count: 'exact', head: true })
                        .eq('game_id', gameId)
                        .neq('status', 'cancelled')
                        .eq('team_assignment', teamAssignment);

                    if (teamCount !== null && (teamCount + partySize > maxPerTeam)) {
                        return NextResponse.json({ error: 'This team does not have enough space for your squad! Please select another.' }, { status: 400 });
                    }
                }
            }
        }
        // --------------------------------------

        // --- VAULTING / SETUP SESSION ---
        // --- WALLET MATH & BYPASS LOGIC ---
        const { data: userProfile } = await adminSupabase
            .from('profiles')
            .select('stripe_customer_id, email, credit_balance')
            .eq('id', userId)
            .single();

        const basePrice = gameConfig?.price ?? price;
        const subtotalUnits = basePrice * partySize;
        const walletBalanceCredits = (userProfile?.credit_balance || 0) / 100;

        let appliedCreditUnits = 0;
        let totalDueUnits = subtotalUnits;

        if (!isFreeAgent && !isLeagueCaptainVaulting && subtotalUnits > 0) {
            appliedCreditUnits = Math.min(walletBalanceCredits, subtotalUnits);
            totalDueUnits = Math.max(0, subtotalUnits - appliedCreditUnits);
        }

        // 100% BYPASS (Free or strictly covered by Wallet)
        if (!isFreeAgent && !isLeagueCaptainVaulting && totalDueUnits === 0) {
            // Deduct from wallet if applicable
            if (appliedCreditUnits > 0) {
                const newBalanceCents = Math.round((walletBalanceCredits - appliedCreditUnits) * 100);
                await adminSupabase.from('profiles').update({ credit_balance: newBalanceCents }).eq('id', userId);
            }

            // Process Bookings (Check-Then-Update Pattern)
            const linkedBookingId = crypto.randomUUID();
            const passengersToProcess: any[] = [
                { game_id: gameId, user_id: userId, status: 'paid', payment_status: 'verified', linked_booking_id: linkedBookingId, note, ...(teamAssignment && { team_assignment: teamAssignment }) }
            ];
            for (const gid of guestIds) {
                passengersToProcess.push({
                    game_id: gameId, user_id: gid, status: 'paid', payment_status: 'verified', linked_booking_id: linkedBookingId, buyer_id: userId, ...(teamAssignment && { team_assignment: teamAssignment })
                });
            }

            for (const passenger of passengersToProcess) {
                try {
                    const { data: existingBooking } = await adminSupabase
                        .from('bookings')
                        .select('id')
                        .eq('game_id', passenger.game_id)
                        .eq('user_id', passenger.user_id)
                        .single();

                    if (existingBooking) {
                        const { error: updateError } = await adminSupabase
                            .from('bookings')
                            .update({
                                status: passenger.status,
                                payment_status: passenger.payment_status,
                                team_assignment: passenger.team_assignment || null,
                                note: passenger.note || null
                            })
                            .eq('id', existingBooking.id);
                        if (updateError) {
                            console.error(`[BYPASS_FAIL] Update failed for user ${passenger.user_id}:`, updateError);
                        }
                    } else {
                        const { error: insertError } = await adminSupabase
                            .from('bookings')
                            .insert([passenger]);
                        if (insertError) {
                            console.error(`[BYPASS_FAIL] Insert failed for user ${passenger.user_id}:`, insertError);
                        }
                    }
                } catch (err: any) {
                    console.error(`[BYPASS_FAIL] Exception while processing user ${passenger.user_id}:`, err);
                }
            }

            return NextResponse.json({ bypassed: true });
        }

        // --- STRIPE SESSION SETUP ---
        const customerParams: any = {};
        if (userProfile?.stripe_customer_id) {
            customerParams.customer = userProfile.stripe_customer_id;
        } else {
            customerParams.customer_creation = 'always';
            if (userProfile?.email) {
                customerParams.customer_email = userProfile.email;
            }
        }

        if (isFreeAgent) {
            const session = await stripe.checkout.sessions.create({
                mode: 'setup',
                ui_mode: 'embedded',
                payment_method_types: ['card'],
                ...customerParams,
                metadata: {
                    game_id: gameId,
                    user_id: userId,
                    note: note,
                    is_free_agent: 'true',
                    ...(promoCodeId && { promo_code_id: promoCodeId })
                },
                return_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            });
            return NextResponse.json({ clientSecret: session.client_secret });
        }

        if (isLeagueCaptainVaulting) {
            // Fetch the deposit_amount for the league
            const { data: gameData } = await adminSupabase
                .from('games')
                .select('deposit_amount, title')
                .eq('id', gameId)
                .single();

            const depositAmt = gameData?.deposit_amount || price;

            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                ui_mode: 'embedded',
                payment_intent_data: {
                    setup_future_usage: 'off_session',
                },
                ...customerParams,
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `League Deposit: ${gameData?.title || title}`,
                            },
                            unit_amount: Math.round(depositAmt * 100),
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    game_id: gameId,
                    user_id: userId,
                    note: note,
                    is_league_captain: 'true',
                    ...(teamAssignment !== undefined && teamAssignment !== null && { team_assignment: teamAssignment.toString() })
                },
                return_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            });
            return NextResponse.json({ clientSecret: session.client_secret });
        }

        // --- STANDARD PAYMENT SESSION ---
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            ui_mode: 'embedded',
            ...customerParams,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: title + (partySize > 1 ? ` (x${partySize} Tickets)` : ''),
                        },
                        unit_amount: Math.round(totalDueUnits * 100), // Adjusted for Wallet math
                    },
                    quantity: 1, // Quantity is 1 because the unit_amount represents the whole squad
                },
            ],
            metadata: {
                game_id: gameId,
                user_id: userId,
                note: note, // Store request note in metadata
                ...(promoCodeId && { promo_code_id: promoCodeId }),
                ...(teamAssignment && { team_assignment: teamAssignment.toString() })
            },
            return_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        });

        // STAGE IN PENDING CHECKOUTS
        await adminSupabase.from('pending_checkouts').insert({
            checkout_session_id: session.id,
            buyer_id: userId,
            game_id: gameId,
            guest_ids: guestIds,
            credit_used: Math.round(appliedCreditUnits * 100),
            ...(teamAssignment && { team_assignment: teamAssignment.toString() })
        });

        return NextResponse.json({ clientSecret: session.client_secret });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
