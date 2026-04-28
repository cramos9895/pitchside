import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { TournamentLobbyClient } from './TournamentLobbyClient';

export const revalidate = 0; // Dynamic data

// Next.js 15 requires params to be a Promise
export default async function TournamentHub({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await params;

    // 1. Fetch Tournament Info
    const { data: tournament, error: tourneyError } = await supabase
        .from('games')
        .select(`
            id, 
            title, 
            location, 
            start_time, 
            end_time,
            team_price,
            free_agent_price,
            league_format
        `)
        .eq('id', id)
        .maybeSingle();

    if (tournament?.league_format === 'rolling') {
        redirect(`/rolling-leagues/${id}`);
    }

    if (tourneyError || !tournament) {
        console.error('Tournament not found or error:', tourneyError);
        notFound();
    }

    // 2. Fetch Verified Teams
    // Micro-Tournaments bind specifically to the game_id on the teams table
    const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, primary_color')
        .eq('game_id', id);

    if (teamsError) {
        console.error('Error fetching teams:', teamsError);
    }

    // 3. (Optional) Fetch Matches for the Bracket Preview
    // Assuming a `matches` table exists linking to `game_id`. If not, this gracefully defaults to 0.
    const { count: matchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        // Usually, matches link to league_id or game_id. We'll blindly check both to be safe or just game_id.
        .filter('game_id', 'eq', id);

    return (
        <TournamentLobbyClient 
            tournament={tournament} 
            teams={teams || []} 
            matchesCount={matchesCount || 0}
        />
    );
}
