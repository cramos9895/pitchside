
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PlayerCommandCenter } from '@/components/public/PlayerCommandCenter';

export default async function TournamentDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 1. Fetch User Registration for this specific game
    console.log('--- DEBUG: TournamentDashboardPage ---');
    console.log('User ID:', user.id);
    console.log('Tournament (Game) ID from params:', id);

    const { data: registration, error: regError } = await supabase
        .from('tournament_registrations')
        .select(`
            *,
            team:teams(*)
        `)
        .eq('game_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
    
    if (regError) {
        console.error('Registration Query Error:', JSON.stringify(regError, null, 2));
    }
    console.log('Registration Data Found:', registration);

    if (!registration) {
        // If not registered, maybe it's a league? Or they just don't belong here.
        // For now, let's just show an error or redirect.
        return (
            <div className="min-h-screen bg-pitch-black flex items-center justify-center p-6 pt-0">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-white uppercase italic">Access Denied</h1>
                    <p className="text-pitch-secondary">You are not registered for this tournament.</p>
                    <a href="/dashboard" className="inline-block px-6 py-2 bg-pitch-accent text-black font-bold uppercase rounded-sm">Back to Dashboard</a>
                </div>
            </div>
        );
    }

    // 2. Fetch Game Details
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select(`
            *,
            facilities(*)
        `)
        .eq('id', id)
        .single();

    if (gameError || !game) {
        return <div>Tournament not found.</div>;
    }

    // 3. Fetch Roster if they are in a team
    let roster = [];
    if (registration.team_id) {
        const { data: teamRoster } = await supabase
            .from('tournament_registrations')
            .select(`
                *,
                profiles:user_id(full_name, avatar_url, email)
            `)
            .eq('team_id', registration.team_id)
            .eq('game_id', id);
        
        roster = teamRoster || [];
    }

    // 4. Fetch Standings Data (Matches and Teams Config)
    const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('game_id', id)
        .order('start_time', { ascending: true });

    return (
        <PlayerCommandCenter 
            user={user}
            registration={registration}
            game={game}
            roster={roster}
            matches={matches || []}
        />
    );
}
