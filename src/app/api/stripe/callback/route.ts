import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    // Determine Domain dynamically for redirect
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // We expect the connect route to have passed the facilityId
    const facilityId = url.searchParams.get('facilityId');
    const refresh = url.searchParams.get('refresh'); // If true, they clicked back or link expired

    if (!facilityId) {
        return NextResponse.redirect(`${baseUrl}/facility/settings/payments?error=missing_facility`);
    }

    // Connect logic loop escape hatch
    if (refresh === 'true') {
        // Technically we could instantly regenerate a link here, 
        // but for safety we will drop them back to their dashboard with a distinct UX
        return NextResponse.redirect(`${baseUrl}/facility/settings/payments?error=link_expired`);
    }

    try {
        const adminSupabase = createAdminClient();

        // 1. We must verify this facility has an account ID attached
        const { data: facility } = await adminSupabase
            .from('facilities')
            .select('stripe_account_id')
            .eq('id', facilityId)
            .single();

        if (!facility || !facility.stripe_account_id) {
            return NextResponse.redirect(`${baseUrl}/facility/settings/payments?error=no_account_linked`);
        }

        // 2. We query Stripe independently to check the actual live status of the connected account
        const account = await stripe.accounts.retrieve(facility.stripe_account_id);

        // 3. Update our DB truth based on the Stripe truth
        // details_submitted usually means they finished the form. charges_enabled means Stripe actually cleared them.
        const isReady = account.charges_enabled || account.details_submitted;

        await adminSupabase
            .from('facilities')
            .update({
                charges_enabled: isReady
            })
            .eq('id', facilityId);

        // Redirect back home. The UI will pick up the true `charges_enabled` boolean naturally.
        return NextResponse.redirect(`${baseUrl}/facility/settings/payments?success=stripe_connected`);

    } catch (error) {
        console.error('[STRIPE_CALLBACK_ERROR]', error);
        return NextResponse.redirect(`${baseUrl}/facility/settings/payments?error=callback_failed`);
    }
}
