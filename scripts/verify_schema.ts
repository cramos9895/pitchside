
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking schema...');

    // Check 'games' table
    const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('has_mvp_reward')
        .limit(1);

    if (gameError) {
        console.error('Error checking games table:', gameError.message);
    } else {
        console.log('Success: has_mvp_reward column exists in games table.');
    }

    // Check 'profiles' table
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('free_game_credits')
        .limit(1);

    if (profileError) {
        console.error('Error checking profiles table:', profileError.message);
    } else {
        console.log('Success: free_game_credits column exists in profiles table.');
    }
}

checkSchema();
