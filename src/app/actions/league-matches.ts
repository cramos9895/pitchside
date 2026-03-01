'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function submitMatchScore(matchId: string, leagueId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    // Verify permissions
    const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id, system_role, role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';

    const adminSupabase = createAdminClient();

    // Verify league ownership
    const { data: existingLeague } = await adminSupabase
        .from('leagues')
        .select('facility_id')
        .eq('id', leagueId)
        .single();

    if (!existingLeague) return { error: 'League not found' };

    if (!isSuperAdmin && existingLeague.facility_id !== profile?.facility_id) {
        return { error: 'Unauthorized to edit this league' };
    }

    const homeScoreRaw = formData.get('home_score');
    const awayScoreRaw = formData.get('away_score');

    if (homeScoreRaw === null || awayScoreRaw === null || homeScoreRaw === '' || awayScoreRaw === '') {
        return { error: 'Both scores are required.' };
    }

    const homeScore = parseInt(homeScoreRaw as string);
    const awayScore = parseInt(awayScoreRaw as string);

    if (isNaN(homeScore) || isNaN(awayScore)) {
        return { error: 'Scores must be numbers.' };
    }

    const { error: updateError } = await adminSupabase
        .from('league_matches')
        .update({
            home_score: homeScore,
            away_score: awayScore,
            status: 'completed'
        })
        .eq('id', matchId);

    if (updateError) {
        console.error("Error updating match score:", updateError);
        return { error: 'Failed to update score.' };
    }

    revalidatePath(`/facility/leagues/${leagueId}`);
    return { success: true };
}
