import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    // 1. Get a rolling league game
    const { data: game } = await supabase.from('games').select('*').eq('event_type', 'league').eq('league_format', 'rolling').limit(1).single();
    if (!game) { console.log('No game found'); return; }
    
    // 2. Get teams
    const { data: teams } = await supabase.from('teams').select('*').eq('game_id', game.id);
    
    console.log(`Game: ${game.id}, Teams: ${teams?.length}`);
    
    // 3. Call scheduleNextRound logic (copied directly or via fetch if it was an API)
    // We can just try to fetch matches and see if it fails.
}
run();
