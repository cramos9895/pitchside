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
            .select('system_role, role, facility_id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return new NextResponse('Profile not found', { status: 404 });
        }

        const isSuperAdmin = profile.system_role === 'super_admin' || profile.role === 'master_admin';
        if (profile.system_role !== 'facility_admin' && !isSuperAdmin) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const facilityId = profile.facility_id;
        if (!isSuperAdmin && !facilityId) {
            return new NextResponse('No facility assigned', { status: 400 });
        }

        const adminSupabase = createAdminClient();

        let targetFacilityId = facilityId;

        // If super admin is accessing, they might pass a facility ID in JSON
        if (isSuperAdmin) {
            try {
                const body = await req.json();
                if (body.facilityId) targetFacilityId = body.facilityId;
            } catch (e) {
                // Ignore empty bodies
            }
        }

        const { data: facility } = await adminSupabase
            .from('facilities')
            .select('id, stripe_account_id')
            .eq('id', targetFacilityId)
            .single();

        if (!facility) {
            return new NextResponse('Facility not found', { status: 404 });
        }

        let accountId = facility.stripe_account_id;

        // 1. Create a Stripe Express Account if they don't have one
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });

            accountId = account.id;

            // Save the ID immediately
            await adminSupabase
                .from('facilities')
                .update({ stripe_account_id: accountId })
                .eq('id', facility.id);
        }

        // 2. Generate the OAuth Onboarding Link
        // We use absolute URLs based on headers to support dev/prod domains
        const url = new URL(req.url);
        const baseUrl = `${url.protocol}//${url.host}`;

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${baseUrl}/api/stripe/callback?facilityId=${facility.id}&refresh=true`,
            return_url: `${baseUrl}/api/stripe/callback?facilityId=${facility.id}`,
            type: 'account_onboarding',
        });

        // Redirect the user into the Stripe hosted workflow
        return NextResponse.json({ url: accountLink.url });
    } catch (error) {
        console.error('[STRIPE_CONNECT_ERROR]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
