import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { CaptainDashboard } from '@/components/public/CaptainDashboard';
import { headers } from 'next/headers';

export const revalidate = 0; // Dynamic data

// Next.js 15 requires params to be a Promise
export default async function CaptainCommandCenter({ params }: { params: Promise<{ id: string; team_id: string }> }) {
    const supabase = await createClient();
    const { id, team_id } = await params;

    // 1. FAST PATH: Check for Rolling League and Redirect IMMEDIATELY
    // We do this before auth or any other heavy lifting to avoid 404s on legacy routes.
    const { data: quickGame } = await supabase
        .from('games')
        .select('league_format')
        .eq('id', id)
        .maybeSingle();

    if (quickGame?.league_format === 'rolling') {
        redirect(`/rolling-leagues/${id}`);
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. Fetch Full Tournament/League Info for Standard Formats
    let tournamentName = '';
    let teamPrice: number | null = null;
    let depositAmount: number | null = null;
    let hasCredit = false;
    let faFee: number | null = null;
    let tournamentFound = false;
    let paymentCollectionType: 'stripe' | 'cash' = 'stripe';
    let cashAmount: number | null = null;
    let cashFeeStructure: string | null = null;
    let isRolling = false;

    let gameTourney: any = null;
    let leagueTourney: any = null;

    try {
        const { data: gData, error: gameError } = await supabase
            .from('games')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        gameTourney = gData;

        if (gameError) {
            console.error('Supabase error fetching game:', gameError);
        }

        if (gameTourney) {
            // Safety check again, though redirected above
            if (gameTourney.league_format === 'rolling') {
                redirect(`/rolling-leagues/${id}`);
            }

            tournamentName = gameTourney.title;
            teamPrice = gameTourney.team_price;
            depositAmount = gameTourney.deposit_amount;
            hasCredit = gameTourney.has_registration_fee_credit;
            faFee = gameTourney.free_agent_price;
            paymentCollectionType = gameTourney.payment_collection_type || 'stripe';
            cashAmount = gameTourney.cash_amount;
            cashFeeStructure = gameTourney.cash_fee_structure;
            isRolling = gameTourney.league_format === 'rolling';
            tournamentFound = true;
        } else {
            const { data: lData, error: lError } = await supabase
                .from('leagues')
                .select('name, price_per_team, description')
                .eq('id', id)
                .maybeSingle();
            
            leagueTourney = lData;

            if (lError) {
                console.error('Supabase error fetching league:', lError);
            }

            if (leagueTourney) {
                tournamentName = leagueTourney.name;
                teamPrice = leagueTourney.price_per_team;
                tournamentFound = true;
            }
        }
    } catch (err) {
        // Only catch actual errors, let Next.js internal redirect/notFound errors propagate
        if ((err as any)?.digest?.startsWith('NEXT_REDIRECT') || (err as any)?.digest?.startsWith('NEXT_NOT_FOUND')) {
            throw err;
        }
        console.error('Error fetching tournament data:', err);
    }

    if (!tournamentFound) {
        console.error('Tournament not found in either games or leagues tables for ID:', id);
        notFound();
    }
    
    // Abstract the shape to match what the client expects
    const tournament = { 
        ...gameTourney,
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
        description: gameTourney?.description || leagueTourney?.description
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
        .eq('id', team_id)
        .maybeSingle();

    if (teamError || !team) {
        console.error('Team not found or error:', teamError);
        // For legacy catchers, we still 404 if the team is missing and it's NOT a rolling league
        // (Rolling leagues are caught by the fast-path at the top)
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
                full_name,
                avatar_url
            )
        `)
        .eq('team_id', team_id)
        .neq('status', 'cancelled');

    if (rosterError) {
        console.error('Error fetching roster:', rosterError.message);
    }

    // 4. Fetch Matches (For Schedule & Standings)
    // Always use the 'matches' table for live data sync
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

    // Map relations to expected naming convention for legacy support if needed
    const processedMatches = (matches || []).map(m => ({
        ...m,
        home_team: m.home_team_rel?.name, // Can be null if TBD
        away_team: m.away_team_rel?.name, // Can be null if TBD
        home_team_obj: m.home_team_rel, // object for UI
        away_team_obj: m.away_team_rel  // object for UI
    }));

    // 5. Fetch Team Messages (For Chat)
    const { data: initialMessages, error: chatError } = await supabase
        .from('messages')
        .select(`
            *,
            profiles(full_name, avatar_url)
        `)
        .eq('team_id', team_id)
        .order('created_at', { ascending: true })
        .limit(100);

    if (chatError) {
        console.error('Chat Fetch Error:', chatError.message, '| Hint:', chatError.hint, '| Code:', chatError.code);
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
                full_name,
                avatar_url
            )
        `)
        .is('team_id', null)
        .neq('status', 'cancelled')
        .or(`league_id.eq.${id},game_id.eq.${id}`);

    if (faError) {
        console.error('Error fetching free agents:', faError.message);
    }

    // 7. Fetch Official Tournament Teams
    const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, primary_color')
        .eq('game_id', id);

    const teams = teamsData || [];

    // Generate the base URL for the invite link
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const tournamentUrlBase = `${protocol}://${host}/tournaments/${id}`;

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
