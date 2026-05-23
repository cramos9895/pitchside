import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { LeagueLobbyClient } from './LeagueLobbyClient';

export const revalidate = 0; // Dynamic data

// Next.js 15 requires params to be a Promise
export default async function LeagueHub({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch League Info
    // Enforce event_type === 'league' to maintain decoupled architecture
    const { data: league, error: leagueError } = await supabase
        .from('games')
        .select(`
            id, 
            title, 
            location, 
            location_nickname,
            location_name,
            start_time, 
            end_time,
            team_price,
            team_registration_fee,
            player_registration_fee,
            free_agent_price,
            cash_amount,
            price,
            payment_collection_type,
            league_format,
            event_type,
            regular_season_start,
            playoff_start_date,
            rules_description,
            waiver_details,
            game_format_type,
            field_size,
            surface_type,
            shoe_types,
            half_length,
            total_game_time,
            match_style,
            prize_type,
            reward,
            fixed_prize_amount,
            prize_pool_percentage,
            allow_free_agents,
            host_ids
        `)
        .eq('id', id)
        .eq('event_type', 'league')
        .maybeSingle();

    if (league?.league_format === 'rolling') {
        redirect(`/rolling-leagues/${id}`);
    }

    if (leagueError || !league) {
        console.error('League not found or error:', leagueError);
        notFound();
    }

    // 2. Fetch Primary Host
    let primaryHost = null;
    if (league.host_ids?.[0]) {
        const { data: hostProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', league.host_ids[0])
            .maybeSingle();
            
        if (hostProfile) {
            primaryHost = {
                name: `${hostProfile.first_name} ${hostProfile.last_name}`,
                email: hostProfile.email
            };
        }
    }

    // 3. Fetch Verified Teams
    const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
            id, 
            name, 
            primary_color,
            accepting_free_agents,
            profiles:captain_id (first_name, last_name),
            tournament_registrations (count)
        `)
        .eq('game_id', id)
        .neq('status', 'cancelled');

    if (teamsError) {
        console.error('Error fetching teams:', teamsError);
    }
    
    // Process teams to match the expected registeredTeams format
    const formattedTeams = teams?.map((t: any) => ({
        id: t.id,
        name: t.name,
        primary_color: t.primary_color,
        captain_name: t.profiles?.first_name ? `${t.profiles.first_name} ${t.profiles.last_name}` : 'Host',
        player_count: t.tournament_registrations?.[0]?.count || 0,
        accepting_free_agents: t.accepting_free_agents
    })) || [];

    // 4. Fetch User Registration
    let userRole: 'unregistered' | 'free_agent' | 'player' | 'captain' = 'unregistered';
    if (user) {
        const { data: userReg } = await supabase
            .from('tournament_registrations')
            .select('role, team_id, status')
            .eq('game_id', id)
            .eq('user_id', user.id)
            .neq('status', 'cancelled')
            .maybeSingle();
            
        if (userReg) {
            if (userReg.team_id) {
                userRole = userReg.role === 'captain' ? 'captain' : 'player';
            } else {
                userRole = 'free_agent';
            }
        }
    }

    return (
        <LeagueLobbyClient 
            league={league as any} 
            teams={formattedTeams} 
            primaryHost={primaryHost}
            userRole={userRole}
            currentUserId={user?.id}
        />
    );
}
