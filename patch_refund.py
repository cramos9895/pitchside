import sys

with open('src/app/actions/cancel-player-registration.ts', 'r') as f:
    content = f.read()

old_select = """            .select(`
                id, 
                status, 
                user_id, 
                stripe_payment_intent_id, 
                payment_status, 
                game_id,"""

new_select = """            .select(`
                id, 
                status, 
                user_id, 
                stripe_payment_intent_id, 
                payment_status, 
                payment_method,
                payment_amount,
                game_id,"""

content = content.replace(old_select, new_select)

stripe_refund_block = """                if (booking.stripe_payment_intent_id && booking.payment_status === 'verified') {
                    try {
                        const refund = await stripe.refunds.create({
                            payment_intent: booking.stripe_payment_intent_id,
                            reason: 'requested_by_customer'
                        });

                        if (refund.status !== 'succeeded' && refund.status !== 'pending') {
                            throw new Error(`Stripe Refund Failed: ${refund.status}`);
                        }
                    } catch (stripeErr: any) {
                        console.error('Stripe Refund Error:', stripeErr);
                        throw new Error(`Could not process your refund. Please contact support. Error: ${stripeErr.message}`);
                    }
                }"""

wallet_refund_block = """                if (booking.stripe_payment_intent_id && booking.payment_status === 'verified') {
                    try {
                        const refund = await stripe.refunds.create({
                            payment_intent: booking.stripe_payment_intent_id,
                            reason: 'requested_by_customer'
                        });

                        if (refund.status !== 'succeeded' && refund.status !== 'pending') {
                            throw new Error(`Stripe Refund Failed: ${refund.status}`);
                        }
                    } catch (stripeErr: any) {
                        console.error('Stripe Refund Error:', stripeErr);
                        throw new Error(`Could not process your refund. Please contact support. Error: ${stripeErr.message}`);
                    }
                } else if (booking.payment_method === 'wallet' && booking.payment_amount > 0) {
                    // Wallet Refund Logic
                    const { data: userProfile, error: profileError } = await adminSupabase
                        .from('profiles')
                        .select('credit_balance')
                        .eq('id', booking.user_id)
                        .single();

                    if (!profileError && userProfile) {
                        const refundCents = Math.round(booking.payment_amount * 100);
                        const newBalance = (userProfile.credit_balance || 0) + refundCents;
                        const { error: walletError } = await adminSupabase
                            .from('profiles')
                            .update({ credit_balance: newBalance })
                            .eq('id', booking.user_id);
                            
                        if (walletError) {
                            throw new Error(`Failed to refund wallet credit: ${walletError.message}`);
                        }
                    }
                }"""

content = content.replace(stripe_refund_block, wallet_refund_block)

with open('src/app/actions/cancel-player-registration.ts', 'w') as f:
    f.write(content)

