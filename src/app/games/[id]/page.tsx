import { createClient } from '@/lib/supabase/server';

import { GameClientPage } from './GameClientPage';
import { notFound, redirect } from 'next/navigation';

export const revalidate = 0;

interface RegisteredTeam {
    id: string;
    name: string;
    captain_name: string;
    player_count: number;
    accepting_free_agents: boolean;
}

export default async function GameDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: gameId } = await params;
    const supabase = await createClient();

    // 1. Fetch Auth User
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Optimized Relational Query for Game & Teams
    // We fetch the game, host details, and all non-cancelled registrations in one go where possible
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

    // 5. Check Participation (Server Side Bouncer)
    let isFreeAgent = false;
    let isParticipant = false;

    if (user) {
        const { data: userReg } = await supabase
            .from('tournament_registrations')
            .select('team_id, status')
            .eq('game_id', gameId)
            .eq('user_id', user.id)
            .neq('status', 'cancelled')
            .maybeSingle();

        if (userReg) {
            isParticipant = true;
            isFreeAgent = !userReg.team_id;
        }
    }

    // If it's a Rolling League, redirect to the unified hub
    if (game.league_format === 'rolling') {
        redirect(`/rolling-leagues/${gameId}`);
    }

    // Otherwise, show the full Interactive Page (Client Side)
    return (
        <GameClientPage 
            initialGame={game}
            initialHost={primaryHost}
            registeredTeams={registeredTeams}
            params={{ id: gameId }}
            currentUser={user}
        />
    );
}
