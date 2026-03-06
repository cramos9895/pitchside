
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const { gameId, userId, price = 10.00, title = 'Pickup Soccer Game', note = '', promoCodeId, teamAssignment } = await request.json();

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
                const teamConfig = game.teams_config[teamAssignment - 1];

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

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
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
