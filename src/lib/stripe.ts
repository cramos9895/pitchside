
import Stripe from 'stripe';

// Fallback prevents Vercel from crashing the entire route at module load time if env var is missing
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_fallback', {
    apiVersion: '2026-01-28.clover' as any,
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
