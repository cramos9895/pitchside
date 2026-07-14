import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { sendNotification } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const adminSupabase = createAdminClient();
        const { bookingId, chargeCard } = await request.json();

        if (!bookingId) {
            return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
        }

        // 1. Fetch booking
        const { data: booking, error: bookingError } = await adminSupabase
            .from('bookings')
            .select('user_id, game_id, stripe_payment_method_id')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // 2. Fetch game info
        const { data: game } = await adminSupabase
            .from('games')
            .select('title, price, start_time, location')
            .eq('id', booking.game_id)
            .single();

        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        // 3. Fetch user profile
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('email, first_name, last_name, stripe_customer_id')
            .eq('id', booking.user_id)
            .single();

        let newStatus = 'active';

        // 4. Handle Charge
        if (chargeCard) {
            if (!booking.stripe_payment_method_id) {
                return NextResponse.json({ error: 'No vaulted card found for this player. Please promote them for free/cash instead.' }, { status: 400 });
            }

            try {
                const amountCents = Math.round((game.price || 0) * 100);
                
                if (amountCents > 0) {
                    const paymentIntent = await stripe.paymentIntents.create({
                        amount: amountCents,
                        currency: 'usd',
                        customer: profile?.stripe_customer_id || undefined,
                        payment_method: booking.stripe_payment_method_id,
                        off_session: true,
                        confirm: true,
                        metadata: {
                            game_id: booking.game_id,
                            user_id: booking.user_id,
                            type: 'waitlist_promotion_charge'
                        }
                    });

                    // Successfully charged
                    await adminSupabase
                        .from('bookings')
                        .update({
                            status: 'paid',
                            payment_status: 'verified',
                            payment_method: 'stripe',
                            roster_status: 'confirmed'
                        })
                        .eq('id', bookingId);
                } else {
                    // Free game
                    await adminSupabase
                        .from('bookings')
                        .update({
                            status: 'paid',
                            payment_status: 'verified',
                            payment_method: 'free',
                            roster_status: 'confirmed'
                        })
                        .eq('id', bookingId);
                }
            } catch (err: any) {
                console.error("Waitlist Promotion Stripe Error:", err);
                return NextResponse.json({ error: `Card charge failed: ${err.message}` }, { status: 400 });
            }
        } else {
            // Free / Cash promotion
            await adminSupabase
                .from('bookings')
                .update({
                    status: 'paid',
                    payment_status: 'unpaid',
                    payment_method: 'cash',
                    roster_status: 'confirmed'
                })
                .eq('id', bookingId);
        }

        // 5. Send Notification
        if (profile?.email) {
            try {
                await sendNotification({
                    to: profile.email,
                    subject: `You've been promoted! Spot confirmed for ${game.title}`,
                    type: 'waitlist_promotion',
                    data: {
                        userName: profile.first_name ? `${profile.first_name} ${profile.last_name}` : 'Player',
                        gameTitle: game.title,
                        gameDate: new Date(game.start_time).toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
                        gameTime: new Date(game.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Chicago' }),
                        location: game.location || 'TBD',
                        claimUrl: chargeCard ? `https://www.pitchsidecf.com/games/${booking.game_id}` : `https://www.pitchsidecf.com/games/${booking.game_id}`,
                        wasCharged: chargeCard
                    }
                });
            } catch (emailErr) {
                console.error("Email notification failed during waitlist promotion:", emailErr);
            }
        }

        return NextResponse.json({ success: true, newStatus: 'paid' });

    } catch (err: any) {
        console.error('Waitlist Promote Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
