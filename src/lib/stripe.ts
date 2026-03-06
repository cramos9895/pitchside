
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
});

export async function refundPayment(paymentIntentId: string, amount?: number) {
    try {
        const refundParams: Stripe.RefundCreateParams = {
            payment_intent: paymentIntentId,
        };

        if (amount) {
            refundParams.amount = amount; // Stripe requires amount in cents
        }

        const refund = await stripe.refunds.create(refundParams);
        return { success: true, refund };
    } catch (error: any) {
        console.error('[STRIPE_REFUND_ERROR]', error.message);
        return { success: false, error: error.message };
    }
}
