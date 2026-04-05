import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/email';

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature') as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (webhookSecret) {
            // Production/Stripe-CLI recommended verification
            event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
        } else {
            // Development fallback if the user hasn't set up the webhook secret via `stripe listen`
            event = JSON.parse(body);
        }
    } catch (err: any) {
        console.error('Webhook signature verification failed.', err.message);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    try {
        const adminSupabase = createAdminClient();

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as any;
            const bookingId = session.metadata?.booking_id;

            if (bookingId) {
                // Finalize the booking!
                const { error } = await adminSupabase
                    .from('resource_bookings')
                    .update({
                        payment_status: 'paid',
                        status: 'confirmed',
                        stripe_payment_intent_id: session.payment_intent
                    })
                    .eq('id', bookingId);

                if (error) console.error('[WEBHOOK_DB_ERROR] Failed to update booking:', error);
                
                const promoCodeId = session.metadata?.promo_code_id;
                if (promoCodeId) {
                    const { data: currentPromo } = await adminSupabase.from('promo_codes').select('current_uses').eq('id', promoCodeId).single();
                    if (currentPromo) {
                        await adminSupabase.from('promo_codes').update({ current_uses: currentPromo.current_uses + 1 }).eq('id', promoCodeId);
                    }
                }

                // Notification Logic
                await handleBookingSuccessNotification(adminSupabase, bookingId, session.amount_total);
            }
        } 
        
        else if (event.type === 'payment_intent.succeeded') {
            const pi = event.data.object as any;
            // Handle off-session payments (Leagues, Shortfalls, etc)
            if (pi.metadata?.type === 'escrow_shortfall' || pi.metadata?.type === 'league_payment') {
                const regId = pi.metadata?.registration_id;
                if (regId) {
                    await adminSupabase.from('tournament_registrations').update({
                        payment_status: 'paid',
                        stripe_payment_intent_id: pi.id
                    }).eq('id', regId);
                }
            } else if (pi.metadata?.type === 'free_agent_draft') {
                const bookingId = pi.metadata?.booking_id;
                if (bookingId) {
                    await adminSupabase.from('bookings').update({
                        status: 'paid',
                        stripe_payment_intent_id: pi.id
                    }).eq('id', bookingId);
                }
            }
        }

        else if (event.type === 'payment_intent.payment_failed') {
            const pi = event.data.object as any;
            console.error(`[STRIPE_WEBHOOK] Payment failed for PI: ${pi.id}`);
            
            // Log failure to DB for visibility
            if (pi.metadata?.registration_id) {
                await adminSupabase.from('tournament_registrations').update({
                    payment_status: 'failed',
                    payment_error: pi.last_payment_error?.message || 'Payment failed'
                }).eq('id', pi.metadata.registration_id);
            }
        }

        else if (event.type === 'charge.refunded') {
            const charge = event.data.object as any;
            const piId = charge.payment_intent;
            
            if (piId) {
                // Sync refund status across tables
                await adminSupabase.from('resource_bookings').update({ payment_status: 'refunded', status: 'cancelled' }).eq('stripe_payment_intent_id', piId);
                await adminSupabase.from('bookings').update({ status: 'cancelled' }).eq('stripe_payment_intent_id', piId);
            }
        }

        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error('[WEBHOOK_HANDLING_ERROR]', error);
        return new NextResponse('Webhook processing failed', { status: 500 });
    }
}

async function handleBookingSuccessNotification(supabase: any, bookingId: string, amountTotal: number) {
    try {
        const { data: bookingData } = await supabase
            .from('resource_bookings')
            .select('start_time, user_id, resource_id')
            .eq('id', bookingId)
            .single();

        if (bookingData) {
            const { data: userProfile } = await supabase.from('profiles').select('email, full_name').eq('id', bookingData.user_id).single();
            const { data: resourceData } = await supabase.from('resources').select('name').eq('id', bookingData.resource_id).single();

            if (userProfile?.email) {
                const resourceName = resourceData?.name || 'Facility Resource';
                const amountPaid = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((amountTotal || 0) / 100);
                const dateStr = `${new Date(bookingData.start_time).toLocaleDateString()} at ${new Date(bookingData.start_time).toLocaleTimeString()}`;

                await sendNotification({
                    to: userProfile.email,
                    subject: `Payment Receipt: ${resourceName}`,
                    type: 'booking_receipt',
                    data: {
                        userName: userProfile.full_name || 'Player',
                        resourceName,
                        gameDate: dateStr,
                        amountCharged: amountPaid
                    }
                });
            }
        }
    } catch (err) {
        console.error('[WEBHOOK_NOTIFICATION_ERROR]', err);
    }
}
