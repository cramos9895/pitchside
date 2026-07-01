'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function approveMatchReport(matchId: string, finalPayout: number) {
    const supabase = await createClient();

    // Verify Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    const { data: profile } = await supabase.from('profiles').select('system_role, role').eq('id', user.id).single();
    if (!profile) throw new Error('Unauthorized');
    
    const isMasterAdmin = profile.role === 'master_admin';
    const isSuperAdmin = profile.system_role === 'super_admin';
    const isRegularAdmin = profile.role === 'host';
    
    if (!isMasterAdmin && !isSuperAdmin && !isRegularAdmin) {
        throw new Error('Unauthorized');
    }

    // Update match
    const { error } = await supabase
        .from('matches')
        .update({ 
            review_status: 'approved',
            final_payout: finalPayout
        })
        .eq('id', matchId)
        .eq('review_status', 'pending_review');

    if (error) {
        throw new Error(`Failed to approve match: ${error.message}`);
    }

    // Trigger referee payouts
    const { data: officials } = await supabase
        .from('match_officials')
        .select('id, payout_method')
        .eq('match_id', matchId)
        .eq('status', 'Confirmed');

    if (officials && officials.length > 0) {
        const { processRefereePayout } = await import('./process-referee-payout');
        for (const official of officials) {
            try {
                // If the admin overrode the payout, update agreed_rate first?
                // For simplicity, we just use the existing agreed_rate. If they want to override, they should edit the official record.
                await processRefereePayout(official.id);
            } catch (err: any) {
                console.error(`Failed to payout official ${official.id}:`, err);
                // Non-fatal, continue with approval
            }
        }
    }

    revalidatePath('/admin/match-reviews');
    revalidatePath(`/admin/games/${matchId}`);
}
