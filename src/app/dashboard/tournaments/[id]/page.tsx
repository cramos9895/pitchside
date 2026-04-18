import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { PlayerCommandCenter } from '@/components/public/PlayerCommandCenter';

export const revalidate = 0; // Dynamic data

export default async function TournamentDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 1. Fetch User Registration for this specific game
    const { data: registration, error: regError } = await supabase
        .from('tournament_registrations')
        .select(`
            *,
            team:teams(id, name)
        `)
        .eq('game_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (!registration) {
        // If not registered, they shouldn't be here or show an empty state
        // For now, redirect to discover or show empty
        redirect('/dashboard');
    }

    // 2. Fetch Game Info
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*, facilities(name, address)')
        .eq('id', id)
        .single();

    if (gameError || !game) {
        notFound();
    }

    // 3. Fetch Roster (if team assigned)
    let roster: any[] = [];
    if (registration.team_id) {
        const { data: rosterData } = await supabase
            .from('tournament_registrations')
            .select(`
                id,
                user_id,
                profiles(full_name, avatar_url)
            `)
            .eq('team_id', registration.team_id)
            .neq('status', 'cancelled');
        roster = rosterData || [];
    }

    // 4. Fetch Standings Data (Matches and Teams Config)
    const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
            *,
            home_team_rel:teams!home_team_id(name),
            away_team_rel:teams!away_team_id(name)
        `)
        .eq('game_id', id)
        .order('start_time', { ascending: true });

    if (matchesError) {
        console.error('Match Fetch Error:', matchesError.message);
    }

    // Map relations to expected naming convention for legacy support
    const processedMatches = (matches || []).map(m => ({
        ...m,
        home_team: m.home_team_rel?.name, // Can be null if TBD
        away_team: m.away_team_rel?.name, // Can be null if TBD
        home_team_obj: m.home_team_rel,
        away_team_obj: m.away_team_rel,
        home_team_name: m.home_team_rel?.name,
        away_team_name: m.away_team_rel?.name
    }));

    // 5. Fetch Official Teams (For Standings row generation)
    const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('game_id', id);

    const teams = teamsData || [];

    return (
        <PlayerCommandCenter 
            user={user}
            registration={registration}
            game={game}
            roster={roster}
            matches={processedMatches}
            teams={teams}
        />
    );
}
