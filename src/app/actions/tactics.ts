'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveMatchLineup(
    matchId: string, 
    teamId: string, 
    formation: string, 
    positions: Record<string, string>
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Security Check: Verify user is the captain of the team
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('captain_id')
        .eq('id', teamId)
        .single();

    if (teamError || team?.captain_id !== user.id) {
        throw new Error('Unauthorized: Only the team captain can save lineups.');
    }

    // Use Admin Client to bypass RLS for the upsert
    const adminSupabase = await createAdminClient();

    const { error } = await adminSupabase
        .from('match_lineups')
        .upsert({
            match_id: matchId,
            team_id: teamId,
            formation,
            positions,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'match_id,team_id'
        });

    if (error) {
        console.error('Error saving lineup:', error);
        throw new Error('Failed to save tactical lineup.');
    }

    revalidatePath(`/rolling-leagues/[id]`, 'page');
}
