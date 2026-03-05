'use server';

import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function createCheckoutSession({
    facilityId,
    resourceId,
    title,
    contactEmail,
    startTime,
    endTime,
    amountCents
}: {
    facilityId: string;
    resourceId: string;
    title: string;
    contactEmail: string;
    startTime: string;
    endTime: string;
    amountCents: number;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'You must be logged in to book a paid resource.' };
    }

    try {
        const adminSupabase = createAdminClient();

        // 1. Fetch Facility Stripe Account
        const { data: facility } = await adminSupabase
            .from('facilities')
            .select('stripe_account_id, charges_enabled, name')
            .eq('id', facilityId)
            .single();

        if (!facility || !facility.stripe_account_id || !facility.charges_enabled) {
            return { error: 'This facility is not properly configured to accept payments yet.' };
        }

        const { data: resource } = await adminSupabase
            .from('resources')
            .select('name')
            .eq('id', resourceId)
            .single();

        // 2. Create the internal Booking Record in "pending_payment" state
        const { data: booking, error: insertError } = await adminSupabase
            .from('resource_bookings')
            .insert({
                facility_id: facilityId,
                resource_id: resourceId,
                user_id: user.id,
                title: title || 'Public Booking',
                start_time: startTime,
                end_time: endTime,
                status: 'pending_payment',
                payment_status: 'unpaid',
                color: '#10b981' // Green for paid
            })
            .select('id')
            .single();

        if (insertError || !booking) {
            console.error('[STRIPE] Booking insert error', insertError);
            return { error: 'Failed to reserve slot. It may have just been taken.' };
        }

        // 3. Calculate PitchSide Application Fee Dynamically
        const { data: platformSettings } = await adminSupabase
            .from('platform_settings')
            .select('fee_type, fee_percent, fee_fixed')
            .eq('id', 1)
            .single();

        let applicationFeeAmount = 0;

        if (platformSettings) {
            const type = platformSettings.fee_type;
            const percent = platformSettings.fee_percent;
            const fixed = platformSettings.fee_fixed;

            switch (type) {
                case 'percent':
                    applicationFeeAmount = Math.round(amountCents * (percent / 100));
                    break;
                case 'fixed':
                    applicationFeeAmount = fixed;
                    break;
                case 'both':
                    applicationFeeAmount = Math.round(amountCents * (percent / 100)) + fixed;
                    break;
                default:
                    // Fallback to 5% safe default if type is unrecognized
                    applicationFeeAmount = Math.round(amountCents * 0.05);
            }
        } else {
            // Ultimate fallback if row is missing entirely
            applicationFeeAmount = Math.round(amountCents * 0.05);
        }

        // 4. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: contactEmail || user.email,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Booking at ${facility.name} - ${resource?.name || 'Resource'}`,
                            description: `${new Date(startTime).toLocaleString()} to ${new Date(endTime).toLocaleString()}`
                        },
                        unit_amount: amountCents,
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                application_fee_amount: applicationFeeAmount,
                transfer_data: {
                    destination: facility.stripe_account_id,
                },
            },
            metadata: {
                booking_id: booking.id,
                facility_id: facilityId
            },
            // Since we are Server Action driven, the easiest is to define an absolute success/cancel URL
            success_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://' + process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1] : 'http://localhost:3000'}/facility/${facility.name}?payment=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://' + process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1] : 'http://localhost:3000'}/facility/${facility.name}?payment=cancelled`,
        });

        // 5. Update booking with session ID (for verification later)
        await adminSupabase
            .from('resource_bookings')
            .update({ stripe_session_id: session.id })
            .eq('id', booking.id);

        return { url: session.url };
    } catch (error: any) {
        console.error('[STRIPE_CHECKOUT_ERROR]', error);
        return { error: 'Failed to initiate checkout. ' + error.message };
    }
}

export async function createContractCheckoutSession(recurringGroupId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'You must be logged in to pay for a contract.' };
    }

    try {
        const adminSupabase = createAdminClient();

        // 1. Fetch Contract Terms
        const { data: contract, error: contractError } = await adminSupabase
            .from('recurring_booking_groups')
            .select('payment_term, final_price, facility_id')
            .eq('id', recurringGroupId)
            .single();

        if (contractError || !contract) {
            return { error: 'Contract terms not found.' };
        }

        // 2. Fetch Facility Stripe Account
        const { data: facility } = await adminSupabase
            .from('facilities')
            .select('stripe_account_id, charges_enabled, name')
            .eq('id', contract.facility_id)
            .single();

        if (!facility || !facility.stripe_account_id || !facility.charges_enabled) {
            return { error: 'This facility is not properly configured to accept payments yet.' };
        }

        // 3. Determine Charge Amount
        let chargeAmount = contract.final_price;
        let isWeekly = contract.payment_term === 'weekly';

        if (isWeekly) {
            // Count number of bookings to split the final_price
            const { count, error: countError } = await adminSupabase
                .from('resource_bookings')
                .select('*', { count: 'exact', head: true })
                .eq('recurring_group_id', recurringGroupId);

            if (!countError && count && count > 0) {
                chargeAmount = Math.round(contract.final_price / count);
            }
        }

        // 4. Calculate PitchSide Application Fee Dynamically
        const { data: platformSettings } = await adminSupabase
            .from('platform_settings')
            .select('fee_type, fee_percent, fee_fixed')
            .eq('id', 1)
            .single();

        let applicationFeeAmount = 0;
        if (platformSettings) {
            const type = platformSettings.fee_type;
            const percent = platformSettings.fee_percent;
            const fixed = platformSettings.fee_fixed;

            switch (type) {
                case 'percent':
                    applicationFeeAmount = Math.round(chargeAmount * (percent / 100));
                    break;
                case 'fixed':
                    applicationFeeAmount = fixed;
                    break;
                case 'both':
                    applicationFeeAmount = Math.round(chargeAmount * (percent / 100)) + fixed;
                    break;
                default:
                    applicationFeeAmount = Math.round(chargeAmount * 0.05);
            }
        } else {
            applicationFeeAmount = Math.round(chargeAmount * 0.05);
        }

        // 5. Build Session Params
        const sessionParams: any = {
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: user.email,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Contract Payment - ${facility.name}`,
                            description: isWeekly ? 'Weekly Installment (Auto-Pay Setup)' : 'Full Upfront Payment'
                        },
                        unit_amount: chargeAmount,
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                application_fee_amount: applicationFeeAmount,
                transfer_data: {
                    destination: facility.stripe_account_id,
                },
            },
            metadata: {
                recurring_group_id: recurringGroupId,
                facility_id: contract.facility_id,
                contract_payment: 'true',
                payment_term: contract.payment_term
            },
            success_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://' + process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1] : 'http://localhost:3000'}/dashboard?payment=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://' + process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1] : 'http://localhost:3000'}/dashboard?payment=cancelled`,
        };

        if (isWeekly) {
            sessionParams.payment_intent_data.setup_future_usage = 'off_session';
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        // 6. Update all bookings in this group with the session ID
        await adminSupabase
            .from('resource_bookings')
            .update({ stripe_session_id: session.id })
            .eq('recurring_group_id', recurringGroupId);

        return { url: session.url };
    } catch (error: any) {
        console.error('[STRIPE_CONTRACT_CHECKOUT_ERROR]', error);
        return { error: 'Failed to initiate contract checkout. ' + error.message };
    }
}
