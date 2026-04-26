import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { RollingLeagueHub } from '@/components/public/RollingLeagueHub';
import { headers } from 'next/headers';

export const revalidate = 0;

interface RegisteredTeam {
    id: string;
    name: string;
    captain_name: string;
    player_count: number;
    accepting_free_agents: boolean;
}

export default async function RollingLeaguePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: gameId } = await params;
    const supabase = await createClient();

    // 1. Fetch Auth User
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Fetch Game Data and Registered Teams
    const [gameResult, regTeamsResult] = await Promise.all([
        supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single(),
        supabase
            .from('tournament_registrations')
            .select(`
                team_id,
                status,
                teams (
                    id,
                    name,
                    accepting_free_agents,
                    profiles:captain_id (
                        full_name
                    )
                )
            `)
            .eq('game_id', gameId)
            .not('team_id', 'is', null)
            .neq('status', 'cancelled')
    ]);

    if (gameResult.error || !gameResult.data) {
        return notFound();
    }

    const game = gameResult.data;
    
    // Safety redirect if not rolling league
    if (game.league_format !== 'rolling') {
        redirect(`/games/${gameId}`);
    }

    // 3. Process Primary Host
    let primaryHost = null;
    if (game.host_ids?.length > 0) {
        const { data: hostProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', game.host_ids[0])
            .single();
        
        if (hostProfile) {
            primaryHost = {
                name: hostProfile.full_name,
                email: hostProfile.email
            };
        }
    }

    // 4. Process Registered Teams & Counts
    const teamMap = new Map<string, RegisteredTeam>();
    regTeamsResult.data?.forEach((reg: any) => {
        const team = reg.teams;
        if (!team) return;

        if (!teamMap.has(team.id)) {
            teamMap.set(team.id, {
                id: team.id,
                name: team.name,
                captain_name: team.profiles?.full_name || 'Host',
                player_count: 0,
                accepting_free_agents: team.accepting_free_agents
            });
        }
        teamMap.get(team.id)!.player_count += 1;
    });
    const registeredTeams = Array.from(teamMap.values());

    // 5. Check Participation
    let userRole: 'unregistered' | 'free_agent' | 'player' | 'captain' = 'unregistered';
    let userTeamId: string | null = null;

    if (user) {
        const { data: userReg } = await supabase
            .from('tournament_registrations')
            .select('team_id, status, role')
            .eq('game_id', gameId)
            .eq('user_id', user.id)
            .neq('status', 'cancelled')
            .maybeSingle();

        if (userReg) {
            if (!userReg.team_id) {
                userRole = 'free_agent';
            } else {
                userTeamId = userReg.team_id;
                
                // Check if captain
                const { data: teamData } = await supabase
                    .from('teams')
                    .select('captain_id')
                    .eq('id', userReg.team_id)
                    .single();
                    
                if (teamData?.captain_id === user.id || userReg.role === 'captain') {
                    userRole = 'captain';
                } else {
                    userRole = 'player';
                }
            }
        }
    }

    // 6. Fetch Team Command Center Data (if player or captain)
    let teamData: any = null;
    let rosterData: any[] = [];
    let freeAgentsData: any[] = [];
    let matchesData: any[] = [];
    let messagesData: any[] = [];
    let allTeamsData: any[] = [];

    if (userRole === 'player' || userRole === 'captain') {
        // A. Fetch Team Info
        const { data: team } = await supabase
            .from('teams')
            .select(`
                id, 
                name, 
                primary_color, 
                accepting_free_agents, 
                captain_id
            `)
            .eq('id', userTeamId)
            .single();
        teamData = team;

        // B. Fetch Roster
        const { data: roster } = await supabase
            .from('tournament_registrations')
            .select(`
                id,
                user_id,
                status,
                preferred_positions,
                profiles (
                    full_name,
                    avatar_url
                )
            `)
            .eq('team_id', userTeamId)
            .neq('status', 'cancelled');
        rosterData = roster || [];

        // C. Fetch Matches
        const { data: matches } = await supabase
            .from('matches')
            .select(`
                *,
                home_team_rel:teams!home_team_id(name),
                away_team_rel:teams!away_team_id(name)
            `)
            .eq('game_id', gameId)
            .order('start_time', { ascending: true });

        matchesData = (matches || []).map(m => ({
            ...m,
            home_team: m.home_team_rel?.name,
            away_team: m.away_team_rel?.name,
            home_team_obj: m.home_team_rel,
            away_team_obj: m.away_team_rel
        }));

        // D. Fetch Messages
        const { data: initialMessages } = await supabase
            .from('messages')
            .select(`
                *,
                profiles(full_name, avatar_url)
            `)
            .eq('team_id', userTeamId)
            .order('created_at', { ascending: true })
            .limit(100);
        messagesData = initialMessages || [];

        // E. Fetch Free Agents
        const { data: freeAgents } = await supabase
            .from('tournament_registrations')
            .select(`
                id,
                user_id,
                status,
                preferred_positions,
                profiles (
                    full_name,
                    avatar_url
                )
            `)
            .is('team_id', null)
            .neq('status', 'cancelled')
            .or(`league_id.eq.${gameId},game_id.eq.${gameId}`);
        freeAgentsData = freeAgents || [];

        // F. Official Teams for Standings
        const { data: teamsDataObj } = await supabase
            .from('teams')
            .select('id, name, primary_color')
            .eq('game_id', gameId);
        allTeamsData = teamsDataObj || [];
    }

    return (
        <RollingLeagueHub 
            game={game}
            currentUser={user}
            userRole={userRole}
            primaryHost={primaryHost}
            registeredTeams={registeredTeams}
            // Command Center Props
            team={teamData}
            roster={rosterData}
            freeAgents={freeAgentsData}
            matches={matchesData}
            initialMessages={messagesData}
            allTeams={allTeamsData}
        />
    );
}
