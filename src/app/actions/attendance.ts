'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function upsertAttendance(gameId: string, teamId: string, matchDate: string, status: 'committed' | 'out' | 'pending') {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from('game_attendance')
        .upsert({
            game_id: gameId,
            user_id: user.id,
            team_id: teamId,
            match_date: matchDate,
            status,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'game_id,user_id,match_date'
        });

    if (error) {
        console.error("Error upserting attendance:", error);
        throw error;
    }

    revalidatePath(`/tournaments/[id]/team/[team_id]`, 'page');
    revalidatePath(`/rolling-leagues/[id]`, 'page');
}

export async function getAttendanceForMatch(gameId: string, matchDate: string) {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
        .from('game_attendance')
        .select('user_id, team_id, status')
        .eq('game_id', gameId)
        .eq('match_date', matchDate);

    if (error) {
        console.error("Error fetching attendance:", error);
        return [];
    }

    return data;
}
