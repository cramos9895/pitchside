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

    // TODO: Fire public leaderboard recalculation
    
    // TODO: Execute Stripe Connect Transfer payload for final_payout (if payment_method === 'digital')

    revalidatePath('/admin/match-reviews');
    revalidatePath(`/admin/games/${matchId}`);
}
