'use server';

import { createClient } from '@/lib/supabase/server';

export async function getGameSuspensions(gameId: string) {
    const supabase = await createClient();
    
    // Get all active matches for this game
    const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .eq('game_id', gameId)
        .in('status', ['scheduled', 'active']);
        
    if (!matches || matches.length === 0) return [];
    
    const matchIds = matches.map(m => m.id);
    
    const { data: suspensions } = await supabase
        .from('match_suspensions')
        .select('user_id, match_id')
        .in('match_id', matchIds);
        
    return suspensions || [];
}
