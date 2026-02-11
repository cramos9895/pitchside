import { createClient } from '@supabase/supabase-js';

// Use Service Role Key for Admin privileges (bypass RLS if needed, though usually RLS allows counting)
// We use the standard client creator if possible, but for backend operations service role is safer.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function syncPlayerCount(gameId: string) {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Supabase credentials for syncPlayerCount");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        // 1. Get count of paid bookings
        const { count, error: countError } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', gameId)
            .eq('status', 'paid');

        if (countError) throw countError;

        const newCount = count || 0;

        // 2. Update game
        const { error: updateError } = await supabase
            .from('games')
            .update({ current_players: newCount })
            .eq('id', gameId);

        if (updateError) throw updateError;

        console.log(`Synced game ${gameId} to ${newCount} players.`);
        return newCount;
    } catch (error) {
        console.error(`Error syncing player count for game ${gameId}:`, error);
        throw error;
    }
}
