
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtksceimduutjrvlcmnm.supabase.co';
// Using the service role key found in .env.local (typo UPABASE...)
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0a3NjZWltZHV1dGpydmxjbW5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM5OTIxNCwiZXhwIjoyMDg1OTc1MjE0fQ.ammhPHbIqImPnXaUzfH7sW9zPSDeMOlzkyQLLdkjE_0';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function forceWaitlist() {
    console.log('Searching for latest game...');

    // 1. Get latest game
    const { data: games, error: fetchError } = await supabase
        .from('games')
        .select('id, title, max_players')
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchError) {
        console.error('Error fetching game:', fetchError);
        return;
    }

    if (!games || games.length === 0) {
        console.log('No games found.');
        return;
    }

    const game = games[0];
    console.log(`Found Game: "${game.title}" (ID: ${game.id})`);
    console.log(`Current Capacity: ${game.max_players}`);

    // 2. Update to 0
    const { error: updateError } = await supabase
        .from('games')
        .update({ max_players: 0 })
        .eq('id', game.id);

    if (updateError) {
        console.error('Error updating game:', updateError);
    } else {
        console.log(`SUCCESS: Game "${game.title}" capacity set to 0.`);
    }
}

forceWaitlist();
