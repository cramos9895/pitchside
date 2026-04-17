import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { CaptainDashboard } from '@/components/public/CaptainDashboard';
import { headers } from 'next/headers';

export const revalidate = 0; // Dynamic data

interface PageProps {
    params: {
        id: string; // The tournament/league id
        team_id: string;
    };
}

export default async function CaptainCommandCenter({ params }: PageProps) {
    const supabase = await createClient();
    const { id, team_id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // In a real strict environment, we would verify `user` is the captain of `team_id`.
    // For this prototype, we just require authentication.
    if (!user) {
        redirect('/login');
    }

    // 1. Fetch Tournament Info
    // Check games first, then leagues
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
        .single();

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
    // We look for matches where league_id or game_id matches the tournament ID
    const { data: matches, error: matchesError } = await supabase
        .from('league_matches')
        .select(`
            *,
            home_team:teams!home_team_id(name),
            away_team:teams!away_team_id(name)
        `)
        .or(`league_id.eq.${id},game_id.eq.${id}`)
        .order('start_time', { ascending: true });

    if (matchesError) {
        console.error('Match Fetch Error:', matchesError.message, '| Hint:', matchesError.hint, '| Code:', matchesError.code);
    }

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
                matches={(matches as any) || []}
                initialMessages={(initialMessages as any) || []}
                tournamentUrlBase={tournamentUrlBase}
                isCaptain={isCaptain}
                currentUserId={user.id}
            />
        </main>
    );
}
