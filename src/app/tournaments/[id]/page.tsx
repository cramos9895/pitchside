import { createClient, createAdminClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { TournamentHub } from '@/components/public/tournaments/TournamentHub';
import { headers } from 'next/headers';
import Link from 'next/link';

export const revalidate = 0;

interface RegisteredTeam {
    id: string;
    name: string;
    captain_name: string;
    player_count: number;
    accepting_free_agents: boolean;
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: gameId } = await params;
    const supabase = await createClient();

    // 1. Fetch Auth User and Core Game Data
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select(`
            id, title, start_time, end_time, location, location_nickname, 
            league_format, host_ids, team_registration_fee, min_players_per_team, 
            max_players_per_team, payment_collection_type, player_registration_fee, 
            cash_amount, price, waiver_details, description, rules_description,
            has_registration_fee_credit, deposit_amount, lifecycle_status,
            lifecycle_end_date, skipped_dates, teams_config, event_type, status, is_active,
            prize_type, prize_pool_percentage, fixed_prize_amount, reward,
            game_format_type, field_size, surface_type, half_length,
            match_style, shoe_types, allow_free_agents, free_agent_price, max_teams
        `)
        .eq('id', gameId)
        .single();

    if (gameError || !game) {
        console.error("Tournament Fetch Failed for Game ID:", gameId);
        
        return (
            <div className="bg-pitch-black min-h-screen flex items-center justify-center p-10 text-center">
                <div className="max-w-md space-y-4">
                    <h1 className="text-2xl font-black text-white uppercase italic">Access Error</h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                        We could not retrieve the tournament data for this ID.
                    </p>
                    <Link 
                        href="/dashboard"
                        className="mt-6 px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-xs tracking-widest transition-all inline-block"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }
    
    if (game.league_format === 'rolling') {
        redirect(`/rolling-leagues/${gameId}`);
    }

    // 1.5. Hidden Event Authorization
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

    // 2. Parallel Fetching
    const [
        regTeamsResult,
        hostProfileResult,
        userRegResult,
        allTeamsResult
    ] = await Promise.all([
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
            .in('status', ['registered', 'paid', 'active', 'confirmed']),
        game.host_ids?.[0] 
            ? supabase.from('profiles').select('first_name, last_name, email').eq('id', game.host_ids[0]).maybeSingle()
            : Promise.resolve({ data: null }),
        user 
            ? supabase.from('tournament_registrations').select('team_id, status, role').eq('game_id', gameId).eq('user_id', user.id).neq('status', 'cancelled').maybeSingle()
            : Promise.resolve({ data: null }),
        supabase.from('teams').select('id, name, primary_color').eq('game_id', gameId)
    ]);

    const primaryHost = hostProfileResult.data ? {
        name: `${hostProfileResult.data.first_name} ${hostProfileResult.data.last_name}`,
        email: hostProfileResult.data.email
    } : null;

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

    let userRole: 'unregistered' | 'free_agent' | 'player' | 'captain' = 'unregistered';
    let userTeamId: string | null = null;
    const userReg = userRegResult.data;

    if (userReg) {
        if (!userReg.team_id) {
            userRole = 'free_agent';
        } else {
            userTeamId = userReg.team_id;
        }
    }

    let teamData: any = null;
    let rosterData: any[] = [];
    let freeAgentsData: any[] = [];
    let matchesData: any[] = [];
    let messagesData: any[] = [];
    let lineupsData: any[] = [];

    if (userTeamId) {
        const [
            teamInfoRes,
            rosterRes,
            matchesRes,
            messagesRes,
            freeAgentsRes,
            lineupsRes
        ] = await Promise.all([
            supabase.from('teams').select('id, name, primary_color, accepting_free_agents, captain_id').eq('id', userTeamId).maybeSingle(),
            supabase.from('tournament_registrations').select('id, user_id, status, preferred_positions, profiles(first_name, last_name, avatar_url)').eq('team_id', userTeamId).neq('status', 'cancelled'),
            supabase.from('matches').select('*, home_team_rel:teams!home_team_id(name), away_team_rel:teams!away_team_id(name)').eq('game_id', gameId).order('start_time', { ascending: true }),
            supabase.from('messages').select('*, profiles(first_name, last_name, avatar_url)').eq('team_id', userTeamId).order('created_at', { ascending: true }).limit(100),
            supabase.from('tournament_registrations').select('id, user_id, status, preferred_positions, profiles(first_name, last_name, avatar_url)').is('team_id', null).neq('status', 'cancelled').or(`league_id.eq.${gameId},game_id.eq.${gameId}`),
            supabase.from('match_lineups').select('*').eq('team_id', userTeamId)
        ]);

        teamData = teamInfoRes.data;
        rosterData = rosterRes.data || [];
        matchesData = (matchesRes.data || []).map(m => ({
            ...m,
            home_team: m.home_team_rel?.name,
            away_team: m.away_team_rel?.name,
            home_team_obj: m.home_team_rel,
            away_team_obj: m.away_team_rel
        }));
        messagesData = messagesRes.data || [];
        freeAgentsData = freeAgentsRes.data || [];
        lineupsData = lineupsRes.data || [];

        if (teamData?.captain_id === user?.id || userReg?.role === 'captain') {
            userRole = 'captain';
        } else {
            userRole = 'player';
        }
    }

    return (
        <TournamentHub 
            game={game as any}
            currentUser={user}
            userRole={userRole}
            primaryHost={primaryHost}
            registeredTeams={registeredTeams}
            team={teamData}
            roster={rosterData}
            freeAgents={freeAgentsData}
            matches={matchesData}
            initialMessages={messagesData}
            allTeams={allTeamsResult.data || []}
            lineups={lineupsData}
        />
    );
}
