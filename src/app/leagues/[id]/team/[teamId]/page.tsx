import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { CaptainDashboard } from '@/components/public/CaptainDashboard';
import { headers } from 'next/headers';

export const revalidate = 0; // Dynamic data

// Next.js 15 requires params to be a Promise
export default async function LeagueCaptainHub({ params }: { params: Promise<{ id: string; teamId: string }> }) {
    const supabase = await createClient();
    const { id, teamId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 1. Fetch League Info
    let tournamentName = '';
    let teamPrice: number | null = null;
    let depositAmount: number | null = null;
    let hasCredit = false;
    let faFee: number | null = null;
    let leagueFound = false;
    let paymentCollectionType: 'stripe' | 'cash' = 'stripe';
    let cashAmount: number | null = null;
    let cashFeeStructure: string | null = null;
    let isRolling = false;

    let gameLeague: any = null;

    try {
        // Enforce event_type === 'league' to maintain decoupled architecture
        const { data: gData, error: gameError } = await supabase
            .from('games')
            .select('*')
            .eq('id', id)
            .eq('event_type', 'league')
            .maybeSingle();

        gameLeague = gData;

        if (gameError) {
            console.error('Supabase error fetching league game:', gameError);
        }

        if (gameLeague) {
            tournamentName = gameLeague.title;
            teamPrice = gameLeague.team_price;
            depositAmount = gameLeague.deposit_amount;
            hasCredit = gameLeague.has_registration_fee_credit;
            faFee = gameLeague.free_agent_price;
            paymentCollectionType = gameLeague.payment_collection_type || 'stripe';
            cashAmount = gameLeague.cash_amount;
            cashFeeStructure = gameLeague.cash_fee_structure;
            isRolling = gameLeague.league_format === 'rolling';
            leagueFound = true;
        }
    } catch (err) {
        if ((err as any)?.digest?.startsWith('NEXT_REDIRECT') || (err as any)?.digest?.startsWith('NEXT_NOT_FOUND')) {
            throw err;
        }
        console.error('Error fetching league data:', err);
    }

    if (!leagueFound) {
        console.error('League not found for ID:', id);
        notFound();
    }
    
    const tournament = { 
        ...gameLeague,
        id, 
        name: tournamentName, 
        price_per_team: teamPrice,
        deposit_amount: depositAmount,
        has_registration_fee_credit: hasCredit,
        free_agent_fee: faFee ?? 50,
        payment_collection_type: paymentCollectionType,
        cash_amount: cashAmount,
        cash_fee_structure: cashFeeStructure,
        is_rolling: isRolling,
        description: gameLeague?.rules_description
    };

    // 2. Fetch Team Info
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .select(`
            id, 
            name, 
            primary_color, 
            accepting_free_agents, 
            captain_id
        `)
        .eq('id', teamId)
        .maybeSingle();

    if (teamError || !team) {
        console.error('Team not found or error:', teamError);
        notFound();
    }

    const isCaptain = user.id === team.captain_id;

    // 3. Fetch Roster
    const { data: roster, error: rosterError } = await supabase
        .from('tournament_registrations')
        .select(`
            id,
            user_id,
            status,
            preferred_positions,
            profiles (
                first_name,
                last_name,
                avatar_url
            )
        `)
        .eq('team_id', teamId)
        .neq('status', 'cancelled');

    if (rosterError) {
        console.error('Error fetching roster:', rosterError.message);
    }

    // 4. Fetch Matches (For Schedule & Standings)
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

    const processedMatches = (matches || []).map(m => ({
        ...m,
        home_team: m.home_team_rel?.name,
        away_team: m.away_team_rel?.name,
        home_team_obj: m.home_team_rel,
        away_team_obj: m.away_team_rel
    }));

    // 5. Fetch Team Messages (For Chat)
    const { data: initialMessages, error: chatError } = await supabase
        .from('messages')
        .select(`
            *,
            profiles(first_name, last_name, avatar_url)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true })
        .limit(100);

    if (chatError) {
        console.error('Chat Fetch Error:', chatError.message);
    }

    // 6. Fetch Free Agents Pool
    const { data: freeAgents, error: faError } = await supabase
        .from('tournament_registrations')
        .select(`
            id,
            user_id,
            status,
            preferred_positions,
            profiles (
                first_name,
                last_name,
                avatar_url
            )
        `)
        .is('team_id', null)
        .neq('status', 'cancelled')
        .eq('game_id', id);

    if (faError) {
        console.error('Error fetching free agents:', faError.message);
    }

    // 7. Fetch Official League Teams
    const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, primary_color')
        .eq('game_id', id);

    const teams = teamsData || [];

    // Generate the base URL for the invite link
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const tournamentUrlBase = `${protocol}://${host}/leagues/${id}`;

    return (
        <main className="bg-pitch-black min-h-screen">
            <CaptainDashboard 
                team={team}
                tournament={tournament as any}
                roster={(roster as any) || []}
                freeAgents={(freeAgents as any) || []}
                matches={(processedMatches as any) || []}
                teams={teams}
                initialMessages={(initialMessages as any) || []}
                tournamentUrlBase={tournamentUrlBase}
                isCaptain={isCaptain}
                currentUserId={user.id}
            />
        </main>
    );
}
