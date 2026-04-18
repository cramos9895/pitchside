'use server';

import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Fallback prevents Vercel from crashing the entire route at module load time if env var is missing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-01-28.clover' as any,
});

export async function createDepositPaymentIntent(amountInCents: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      payment_method_types: ['card', 'cashapp'],
    });

    return { clientSecret: paymentIntent.client_secret };
  } catch (error: any) {
    console.error('Error creating PaymentIntent:', error);
    throw new Error('Could not initialize payment processing.');
  }
}

export async function createSetupIntent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      usage: 'off_session', // Crucial for deferred billing
    });

    return { clientSecret: setupIntent.client_secret, id: setupIntent.id };
  } catch (error: any) {
    console.error('Error creating SetupIntent:', error);
    throw new Error('Could not initialize payment method setup.');
  }
}
