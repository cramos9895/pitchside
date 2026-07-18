import { createClient } from '@/lib/supabase/server';

import { TournamentClientPage } from './TournamentClientPage';
import { PickupClientPage } from './PickupClientPage';
import { LeagueClientPage } from './LeagueClientPage';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

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
            .maybeSingle(),
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
                        first_name,
                        last_name
                    )
                )
            `)
            .eq('game_id', gameId)
            .not('team_id', 'is', null)
            .neq('status', 'cancelled')
    ]);

    const game = gameResult.data;

    // If it's a Rolling League, redirect to the unified hub immediately
    if (game?.league_format === 'rolling') {
        redirect(`/rolling-leagues/${gameId}`);
    }

    if (gameResult.error || !game) {
        return notFound();
    }

    // 2.5. Hidden Event Authorization
    let isAuthorized = true;
    if (game.is_active === false) {
        isAuthorized = false;
        if (user) {
            if (game.host_ids?.includes(user.id)) {
                isAuthorized = true;
            } else {
                const { data: profile } = await supabase.from('profiles').select('role, system_role').eq('id', user.id).single();
                if (profile && (profile.role === 'master_admin' || profile.system_role === 'super_admin')) {
                    isAuthorized = true;
                }
            }
        }
    }

    if (!isAuthorized) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                <div className="bg-pitch-card border border-white/10 rounded-sm p-8 max-w-md w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-900"></div>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-3xl">🚫</span>
                        </div>
                        <h2 className="text-2xl font-bold uppercase italic tracking-tighter text-white mb-2">Access Denied</h2>
                        <p className="text-pitch-secondary mb-8 font-bold">This event is hidden.</p>
                        <Link href="/" className="inline-flex w-full justify-center items-center gap-2 px-6 py-3 bg-white text-black font-black uppercase tracking-wider rounded-sm hover:bg-[#cbff00] transition-colors">
                            Return to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Process Primary Host
    let primaryHost = null;
    if (game.host_ids?.length > 0) {
        const { data: hostProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', game.host_ids[0])
            .single();
        
        if (hostProfile) {
            primaryHost = {
                name: `${hostProfile.first_name} ${hostProfile.last_name}`,
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
                captain_name: team.profiles?.first_name ? `${team.profiles.first_name} ${team.profiles.last_name}` : 'Host',
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


    // Otherwise, show the full Interactive Page (Client Side) based on event type
    if (game.event_type === 'tournament') {
        return (
            <TournamentClientPage 
                initialGame={game}
                initialHost={primaryHost}
                registeredTeams={registeredTeams}
                params={{ id: gameId }}
                currentUser={user}
                isParticipantServer={isParticipant}
                isFreeAgentServer={isFreeAgent}
            />
        );
    } else if (game.event_type === 'pickup') {
        return (
            <PickupClientPage 
                initialGame={game}
                initialHost={primaryHost}
                registeredTeams={registeredTeams}
                params={{ id: gameId }}
                currentUser={user}
                isParticipantServer={isParticipant}
                isFreeAgentServer={isFreeAgent}
            />
        );
    } else {
        return (
            <LeagueClientPage 
                initialGame={game}
                initialHost={primaryHost}
                registeredTeams={registeredTeams}
                params={{ id: gameId }}
                currentUser={user}
                isParticipantServer={isParticipant}
                isFreeAgentServer={isFreeAgent}
            />
        );
    }
}
