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

    try {
        const { data: gameTourney } = await supabase
            .from('games')
            .select('title, team_price, deposit_amount, has_registration_fee_credit, free_agent_price')
            .eq('id', id)
            .maybeSingle();

        if (gameTourney) {
            tournamentName = gameTourney.title;
            teamPrice = gameTourney.team_price;
            depositAmount = gameTourney.deposit_amount;
            hasCredit = gameTourney.has_registration_fee_credit;
            faFee = gameTourney.free_agent_price;
            tournamentFound = true;
        } else {
            const { data: leagueTourney } = await supabase
                .from('leagues')
                .select('name, price_per_team')
                .eq('id', id)
                .maybeSingle();
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
        id, 
        name: tournamentName, 
        price_per_team: teamPrice,
        deposit_amount: depositAmount,
        has_registration_fee_credit: hasCredit,
        free_agent_fee: faFee ?? 50 // Use the fetched fee, with $50 as safety fallback
    };

    // 2. Fetch Team Info
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name, primary_color, accepting_free_agents')
        .eq('id', team_id)
        .single();

    if (teamError || !team) {
        console.error('Team not found or error:', teamError);
        notFound();
    }

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

    // 4. Fetch Free Agents Pool
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
                tournament={tournament}
                roster={(roster as any) || []}
                freeAgents={(freeAgents as any) || []}
                tournamentUrlBase={tournamentUrlBase}
            />
        </main>
    );
}
