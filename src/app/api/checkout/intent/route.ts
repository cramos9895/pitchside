import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const { gameId, userId, price, title, note, promoCodeId, teamAssignment, isFreeAgent, isLeagueCaptainVaulting } = await request.json();

        const adminSupabase = createAdminClient();
        const { data: userProfile } = await adminSupabase
            .from('profiles')
            .select('stripe_customer_id, email')
            .eq('id', userId)
            .single();

        const amountInCents = Math.round(price * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            customer: userProfile?.stripe_customer_id || undefined,
            payment_method_types: ['card', 'cashapp'],
            setup_future_usage: isLeagueCaptainVaulting ? 'off_session' : undefined,
            metadata: {
                game_id: gameId,
                user_id: userId,
                note: note || '',
                is_free_agent: isFreeAgent ? 'true' : 'false',
                is_league_captain: isLeagueCaptainVaulting ? 'true' : 'false',
                promo_code_id: promoCodeId || '',
                team_assignment: teamAssignment || ''
            },
        });

        return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
        console.error('Stripe Intent Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
