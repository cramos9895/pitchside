import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const explicitStartTime = new Date().toISOString();

    // Update the first game we find
    const { data: fetchGame } = await supabase.from('games').select('id').limit(1).single();
    if (!fetchGame) return console.log("NO GAME FOUND");

    console.log(`Updating game ${fetchGame.id} with ${explicitStartTime}`);

    const { data, error } = await supabase
        .from('games')
        .update({
            timer_status: 'running',
            timer_started_at: explicitStartTime,
        })
        .eq('id', fetchGame.id)
        .select();

    console.log("UPDATE RESULT:", { data, error });

    // Now fetch it back to prove it persisted
    const { data: verifyData } = await supabase.from('games').select('id, timer_status, timer_started_at').eq('id', fetchGame.id).single();
    console.log("VERIFY FETCH:", verifyData);
}
run();
