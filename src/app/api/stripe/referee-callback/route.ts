import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const refresh = url.searchParams.get('refresh'); 

    if (refresh === 'true') {
        return NextResponse.redirect(`${baseUrl}/referee?error=link_expired`);
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(`${baseUrl}/login`);
        }

        // We query Stripe independently to check the actual live status of the connected account
        // (Just to make sure they finished. The profile already has the stripe_account_id saved.)
        
        return NextResponse.redirect(`${baseUrl}/referee?success=stripe_connected`);

    } catch (error) {
        console.error('[STRIPE_REFEREE_CALLBACK_ERROR]', error);
        return NextResponse.redirect(`${baseUrl}/referee?error=callback_failed`);
    }
}
