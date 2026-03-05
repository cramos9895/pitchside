import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/email';
import { BookingConfirmedEmail } from '@/emails/BookingConfirmedEmail';

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
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as any;
            const bookingId = session.metadata?.booking_id;

            if (bookingId) {
                const adminSupabase = createAdminClient();

                // Finalize the booking!
                const { error } = await adminSupabase
                    .from('resource_bookings')
                    .update({
                        payment_status: 'paid',
                        status: 'confirmed'  // We auto-confirm paid bookings natively.
                    })
                    .eq('id', bookingId);

                if (error) {
                    console.error('[WEBHOOK_DB_ERROR] Failed to update booking:', error);
                } else {
                    console.log(`[STRIPE_WEBHOOK] Successfully confirmed booking ${bookingId}`);

                    // Trigger 3: Send Receipt Email
                    try {
                        const { data: bookingData } = await adminSupabase
                            .from('resource_bookings')
                            .select('start_time, user_id, resource_id')
                            .eq('id', bookingId)
                            .single();

                        if (bookingData) {
                            const { data: userProfile } = await adminSupabase
                                .from('profiles')
                                .select('email')
                                .eq('id', bookingData.user_id)
                                .single();

                            const { data: resourceData } = await adminSupabase
                                .from('resources')
                                .select('name')
                                .eq('id', bookingData.resource_id)
                                .single();

                            if (userProfile?.email) {
                                const resourceName = resourceData?.name || 'Facility Resource';
                                const amountPaid = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((session.amount_total || 0) / 100);
                                const dateStr = `${new Date(bookingData.start_time).toLocaleDateString()} at ${new Date(bookingData.start_time).toLocaleTimeString()}`;

                                await sendNotification({
                                    to: userProfile.email,
                                    subject: `Payment Receipt: ${resourceName}`,
                                    type: 'booking_receipt',
                                    react: BookingConfirmedEmail({
                                        resourceName,
                                        dates: [dateStr],
                                        amountPaid
                                    })
                                });
                                console.log(`[STRIPE_WEBHOOK] Sent BookingConfirmedEmail to ${userProfile.email}`);
                            }
                        }
                    } catch (emailErr) {
                        console.error('[WEBHOOK_EMAIL_ERROR] Failed to send receipt:', emailErr);
                    }
                }
            }
        }

        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error('[WEBHOOK_HANDLING_ERROR]', error);
        return new NextResponse('Webhook processing failed', { status: 500 });
    }
}
