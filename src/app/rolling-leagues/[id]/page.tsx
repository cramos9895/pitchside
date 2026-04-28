import { createClient, createAdminClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { RollingLeagueHub } from '@/components/public/RollingLeagueHub';
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

export default async function RollingLeaguePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: gameId } = await params;
    const supabase = await createClient();

    // 1. Fetch Auth User and Core Game Data (Sequential to avoid dependency trap)
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select(`
            id, title, start_time, end_time, location, location_nickname, 
            league_format, host_ids, team_registration_fee, min_players_per_team, 
            max_players_per_team, payment_collection_type, player_registration_fee, 
            cash_amount, price, waiver_details, 
            has_registration_fee_credit, deposit_amount, lifecycle_status,
            lifecycle_end_date, skipped_dates, teams_config, event_type, status,
            prize_type, prize_pool_percentage, fixed_prize_amount, reward,
            game_format_type, field_size, surface_type, half_length,
            match_style, shoe_types, allow_free_agents, free_agent_price
        `)
        .eq('id', gameId)
        .single();

    if (gameError || !game) {
        // Diagnostic Logging
        console.error("Hub Fetch Failed for Game ID:", gameId);
        console.error("Error Details:", JSON.stringify(gameError, null, 2));
        
        // Test with Admin Client to see if it's an RLS issue
        const adminClient = await createAdminClient();
        const { data: adminGame, error: adminError } = await adminClient
            .from('games')
            .select('id, title, league_format')
            .eq('id', gameId)
            .maybeSingle();
        
        console.log("Admin Client Rescue Check:", adminGame ? "SUCCESS" : "FAILED");
        if (adminError) console.error("Admin Client Error:", adminError);

        return (
            <div className="bg-pitch-black min-h-screen flex items-center justify-center p-10 text-center">
                <div className="max-w-md space-y-4">
                    <h1 className="text-2xl font-black text-white uppercase italic">Access Error</h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                        We could not retrieve the league data for this ID. This is usually caused by a strict RLS policy or a missing record.
                    </p>
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-[10px] font-mono break-all">
                        ID: {gameId} <br/>
                        ERROR: {gameError?.message || 'Record Not Found'}
                    </div>
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
    
    // Safety redirect if not rolling league
    if (game.league_format !== 'rolling') {
        redirect(`/games/${gameId}`);
    }

    // 2. Parallel Fetching (Dependent on user or game)
    const [
        regTeamsResult,
        hostProfileResult,
        userRegResult,
        allTeamsResult
    ] = await Promise.all([
        // All team registrations for this game
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
            .neq('status', 'cancelled'),

        // Primary Host Profile
        game.host_ids?.[0] 
            ? supabase.from('profiles').select('full_name, email').eq('id', game.host_ids[0]).maybeSingle()
            : Promise.resolve({ data: null }),

        // Current User Registration
        user 
            ? supabase.from('tournament_registrations').select('team_id, status, role').eq('game_id', gameId).eq('user_id', user.id).neq('status', 'cancelled').maybeSingle()
            : Promise.resolve({ data: null }),

        // All Teams for Standings
        supabase.from('teams').select('id, name, primary_color').eq('game_id', gameId)
    ]);

    // 3. Process Primary Host
    const primaryHost = hostProfileResult.data ? {
        name: hostProfileResult.data.full_name,
        email: hostProfileResult.data.email
    } : null;

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

    // 5. Determine User Role
    let userRole: 'unregistered' | 'free_agent' | 'player' | 'captain' = 'unregistered';
    let userTeamId: string | null = null;
    const userReg = userRegResult.data;

    if (userReg) {
        if (!userReg.team_id) {
            userRole = 'free_agent';
        } else {
            userTeamId = userReg.team_id;
            // We'll verify captain status in Step 6
        }
    }

    // 6. Fetch Team-Specific Command Center Data (if applicable)
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
            supabase.from('tournament_registrations').select('id, user_id, status, preferred_positions, profiles(full_name, avatar_url)').eq('team_id', userTeamId).neq('status', 'cancelled'),
            supabase.from('matches').select('*, home_team_rel:teams!home_team_id(name), away_team_rel:teams!away_team_id(name)').eq('game_id', gameId).order('start_time', { ascending: true }),
            supabase.from('messages').select('*, profiles(full_name, avatar_url)').eq('team_id', userTeamId).order('created_at', { ascending: true }).limit(100),
            supabase.from('tournament_registrations').select('id, user_id, status, preferred_positions, profiles(full_name, avatar_url)').is('team_id', null).neq('status', 'cancelled').or(`league_id.eq.${gameId},game_id.eq.${gameId}`),
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

        // Finalize Role
        if (teamData?.captain_id === user?.id || userReg?.role === 'captain') {
            userRole = 'captain';
        } else {
            userRole = 'player';
        }
    }

    return (
        <RollingLeagueHub 
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

