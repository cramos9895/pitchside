import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, stripe_account_id, email, first_name, last_name')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return new NextResponse('Profile not found', { status: 404 });
        }

        const adminSupabase = createAdminClient();
        let accountId = profile.stripe_account_id;

        // 1. Create a Stripe Express Account if they don't have one
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                email: profile.email || undefined,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });

            accountId = account.id;

            // Save the ID immediately
            await adminSupabase
                .from('profiles')
                .update({ stripe_account_id: accountId })
                .eq('id', profile.id);
        }

        // 2. Generate the OAuth Onboarding Link
        const url = new URL(req.url);
        const baseUrl = `${url.protocol}//${url.host}`;

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${baseUrl}/api/stripe/referee-callback?refresh=true`,
            return_url: `${baseUrl}/api/stripe/referee-callback`,
            type: 'account_onboarding',
        });

        return NextResponse.json({ url: accountLink.url });
    } catch (error) {
        console.error('[STRIPE_REFEREE_CONNECT_ERROR]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
