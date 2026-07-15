'use server';

import { createAdminClient } from "@/lib/supabase/server";

export async function getRefereeSchedules(userIds: string[]) {
    if (!userIds || userIds.length === 0) return [];
    
    const supabaseAdmin = await createAdminClient();

    const { data, error } = await supabaseAdmin
        .from('match_officials')
        .select('*, matches(id, start_time, scheduled_time, field_name, home_team, away_team, game_id, games(event_type))')
        .in('user_id', userIds)
        .eq('status', 'Confirmed');

    if (error) {
        console.error('Error fetching ref schedules:', error);
        return [];
    }
    
    return data || [];
}
