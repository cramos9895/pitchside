
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const { gameId, userId, price = 10.00, title = 'Pickup Soccer Game', note = '', promoCodeId, teamAssignment, isFreeAgent, isLeagueCaptainVaulting } = await request.json();

        const origin = request.headers.get('origin') || 'http://localhost:3000';

        // --- ENFORCER: SQUAD CAPACITY CHECK ---
        if (teamAssignment !== undefined && teamAssignment !== null) {
            const adminSupabase = createAdminClient();

            // 1. Get Game Limits
            const { data: game } = await adminSupabase
                .from('games')
                .select('teams_config')
                .eq('id', gameId)
                .single();

            if (game && game.teams_config && Array.isArray(game.teams_config)) {
                const teamConfig = game.teams_config.find((t: any) => t.name === teamAssignment);

                if (teamConfig && teamConfig.limit && teamConfig.limit > 0) {
                    const maxPerTeam = teamConfig.limit;

                    // 2. Get Current Team Roster Size
                    const { count } = await adminSupabase
                        .from('bookings')
                        .select('*', { count: 'exact', head: true })
                        .eq('game_id', gameId)
                        .neq('status', 'cancelled')
                        .eq('team_assignment', teamAssignment);

                    if (count !== null && count >= maxPerTeam) {
                        return NextResponse.json({ error: 'This team just filled up! Please select another squad.' }, { status: 400 });
                    }
                }
            }
        }
        // --------------------------------------

        // --- VAULTING / SETUP SESSION ---
        const adminSupabase = createAdminClient();
        const { data: userProfile } = await adminSupabase
            .from('profiles')
            .select('stripe_customer_id, email')
            .eq('id', userId)
            .single();

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
                payment_method_types: ['card'],
                ...customerParams,
                metadata: {
                    game_id: gameId,
                    user_id: userId,
                    note: note,
                    is_free_agent: 'true',
                    ...(promoCodeId && { promo_code_id: promoCodeId })
                },
                success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${origin}/`,
            });
            return NextResponse.json({ url: session.url });
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
                success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${origin}/`,
            });
            return NextResponse.json({ url: session.url });
        }

        // --- STANDARD PAYMENT SESSION ---
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            ...customerParams,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: title,
                        },
                        unit_amount: Math.round(price * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                game_id: gameId,
                user_id: userId,
                note: note, // Store request note in metadata
                ...(promoCodeId && { promo_code_id: promoCodeId }),
                ...(teamAssignment !== undefined && teamAssignment !== null && { team_assignment: teamAssignment.toString() })
            },
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
