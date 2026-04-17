import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { InviteClient } from './InviteClient';

export const revalidate = 0;

// Next.js 15 requires params to be a Promise
export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id: teamId } = await params;
    
    console.log('Invite Page Hit for teamId:', teamId);

    // 1. Auth Check - Redirect with callback
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/login?callbackUrl=/invite/${teamId}`);
    }

    // 2. Fetch Team and Tournament Data (Join Profile for Captain Name)
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .select(`
            id,
            name,
            game_id,
            league_id,
            profiles:captain_id (
                full_name
            )
        `)
        .eq('id', teamId)
        .single();

    if (teamError || !team) {
        console.error('Invite Page: Team not found', teamId);
        notFound();
    }

    const tournamentId = team.game_id || team.league_id;
    if (!tournamentId) {
        return <div className="p-20 text-center text-red-500 font-bold uppercase">Invalid Invite Configuration</div>;
    }

    // 3. Fetch Tournament Details & Roster Metrics
    let tournamentName = '';
    let totalFee = 0;
    
    // Detailed game fetch for financial logic
    const { data: gameData } = await supabase
        .from('games')
        .select(`
            title, 
            team_registration_fee, 
            min_players_per_team, 
            max_players_per_team,
            payment_collection_type,
            player_registration_fee,
            cash_amount,
            price,
            waiver_details
        `)
        .eq('id', tournamentId)
        .single();

    if (gameData) {
        tournamentName = gameData.title;
        totalFee = gameData.team_registration_fee || 0;
    } else {
        const { data: leagueData } = await supabase
            .from('leagues')
            .select('name, price_per_team, waiver_details')
            .eq('id', tournamentId)
            .single();
        
        if (leagueData) {
            tournamentName = leagueData.name;
            totalFee = leagueData.price_per_team || 0;
        }
    }

    // 4. Fetch Roster Count to calculate split
    const { count: rosterCount } = await supabase
        .from('tournament_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .neq('status', 'cancelled');

    // 4.5 Authoritative Captain Name from joined profile
    const captainName = (team.profiles as any)?.full_name || 'Your Captain';

    // 5. Check if Team is Full Pay (Captain's payment status)
    const { data: captainReg } = await supabase
        .from('tournament_registrations')
        .select('payment_status')
        .eq('team_id', teamId)
        .eq('role', 'captain')
        .maybeSingle();

    const isFullPay = captainReg?.payment_status === 'full_pay';

    const minPlayers = gameData?.min_players_per_team || (gameData as any)?.min_roster || 5;
    const maxPlayers = gameData?.max_players_per_team || (gameData as any)?.max_roster || 12;

    return (
        <main className="bg-pitch-black min-h-screen pt-32 px-4 pb-24">
            <div className="max-w-xl mx-auto border-t-4 pt-8" style={{ borderColor: '#cbff00' }}>
                <InviteClient 
                    teamId={team.id}
                    teamName={team.name}
                    tournamentId={tournamentId}
                    tournamentName={tournamentName}
                    totalFee={totalFee}
                    rosterCount={rosterCount || 1}
                    isFullPay={isFullPay}
                    captainName={captainName}
                    minPlayers={minPlayers}
                    maxPlayers={maxPlayers}
                    paymentCollectionType={gameData?.payment_collection_type || 'stripe'}
                    playerRegistrationFee={gameData?.player_registration_fee || 0}
                    perGameFee={gameData?.cash_amount || gameData?.price || 0}
                    waiverDetails={gameData?.waiver_details || (gameData as any)?.waiver_details}
                />
            </div>
        </main>
    );
}
