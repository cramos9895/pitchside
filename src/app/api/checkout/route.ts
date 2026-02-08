
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: Request) {
    try {
        const { gameId, userId, price = 10.00, title = 'Pickup Soccer Game', note = '' } = await request.json();

        const origin = request.headers.get('origin') || 'http://localhost:3000';

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
                note: note // Store request note in metadata
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
