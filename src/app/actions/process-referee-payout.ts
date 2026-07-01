'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';

export async function processRefereePayout(officialId: string) {
    const supabase = await createClient();
    
    // 1. Check permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    const { data: profile } = await supabase.from('profiles').select('role, system_role').eq('id', user.id).single();
    if (profile?.role !== 'admin' && profile?.role !== 'host' && profile?.system_role !== 'super_admin' && profile?.role !== 'master_admin') {
        throw new Error('Unauthorized to process payouts');
    }

    // 2. Fetch Match Official details
    const { data: official, error: fetchError } = await supabase
        .from('match_officials')
        .select(`
            id,
            user_id,
            agreed_rate,
            payout_method,
            status,
            payout_status,
            match_id,
            profiles(stripe_connect_account_id)
        `)
        .eq('id', officialId)
        .single();

    if (fetchError || !official) {
        throw new Error('Official not found');
    }

    if (official.payout_status === 'Paid') {
        throw new Error('Payout has already been processed');
    }

    if (official.status !== 'Confirmed') {
        throw new Error('Cannot pay an unconfirmed official');
    }

    // 3. Process Payout Based on Method
    try {
        if (official.payout_method === 'Stripe') {
            const stripeAccountId = (official.profiles as any)?.stripe_connect_account_id;
            
            if (!stripeAccountId) {
                throw new Error('Referee has not completed Stripe onboarding');
            }

            // Execute Stripe Transfer
            const transfer = await stripe.transfers.create({
                amount: Math.round((official.agreed_rate || 0) * 100), // Convert to cents
                currency: 'usd',
                destination: stripeAccountId,
                description: `PitchSide Match Payout - ${official.match_id}`,
                metadata: {
                    match_id: official.match_id,
                    official_id: official.id
                }
            });

            // Update status to Paid and log transaction
            await supabase.from('match_officials').update({ payout_status: 'Paid' }).eq('id', officialId);

            // TODO: Ideally we insert into a transactions table here
            console.log('Stripe transfer successful:', transfer.id);
        } else if (official.payout_method === 'Manual') {
            // Log manual payout
            await supabase.from('match_officials').update({ payout_status: 'Paid' }).eq('id', officialId);
        } else {
            throw new Error(`Unknown payout method: ${official.payout_method}`);
        }

        revalidatePath('/admin/games');
        return { success: true };
    } catch (error: any) {
        console.error('Payout error:', error);
        return { success: false, error: error.message };
    }
}
