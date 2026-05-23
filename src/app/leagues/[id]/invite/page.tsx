// 🏗️ Architecture: League Invite page
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { LeagueInviteClient } from './LeagueInviteClient';

export const revalidate = 0;

export default async function LeagueInvitePage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id: teamId } = await params;

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/login?next=/leagues/team/${teamId}/invite`); // Adjusting for expected path
    }

    // 2. Fetch Team
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name, game_id, league_id, captain_id')
        .eq('id', teamId)
        .single();

    if (teamError || !team) {
        console.error('[League Invite] Team lookup failed for ID:', teamId);
        notFound();
    }

    // 2b. Fetch captain name
    let captainName = 'Your Captain';
    if (team.captain_id) {
        const { data: captainProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', team.captain_id)
            .single();
        if (captainProfile?.first_name) {
            captainName = `${captainProfile.first_name} ${captainProfile.last_name}`;
        }
    }

    const leagueId = team.league_id || team.game_id;
    if (!leagueId) {
        return <div className="p-20 text-center text-red-500 font-bold uppercase">Invalid Invite Configuration</div>;
    }

    // 3. Fetch League Details
    let leagueName = '';
    let totalFee = 0;
    let gameData: any = null;

    const { data: gData } = await supabase
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
        .eq('id', leagueId)
        .single();

    if (gData) {
        gameData = gData;
        leagueName = gData.title;
        totalFee = gData.team_registration_fee || 0;
    } else {
        const { data: leagueData } = await supabase
            .from('leagues')
            .select('name, price_per_team, waiver_details')
            .eq('id', leagueId)
            .single();
        
        if (leagueData) {
            leagueName = leagueData.name;
            totalFee = leagueData.price_per_team || 0;
        }
    }

    // 4. Fetch Roster Count
    const { count: rosterCount } = await supabase
        .from('tournament_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .neq('status', 'cancelled');

    // 5. Check if Captain paid
    const { data: captainReg } = await supabase
        .from('tournament_registrations')
        .select('payment_status')
        .eq('team_id', teamId)
        .eq('role', 'captain')
        .maybeSingle();

    const isFullPay = captainReg?.payment_status === 'full_pay';

    const minPlayers = gameData?.min_players_per_team || 5;
    const maxPlayers = gameData?.max_players_per_team || 12;

    return (
        <main className="bg-pitch-black min-h-screen pt-32 px-4 pb-24">
            <div className="max-w-xl mx-auto border-t-4 pt-8" style={{ borderColor: '#cbff00' }}>
                <LeagueInviteClient 
                    teamId={team.id}
                    teamName={team.name}
                    leagueId={leagueId}
                    leagueName={leagueName}
                    totalFee={totalFee}
                    rosterCount={rosterCount || 1}
                    isFullPay={isFullPay}
                    captainName={captainName}
                    minPlayers={minPlayers}
                    maxPlayers={maxPlayers}
                    paymentCollectionType={gameData?.payment_collection_type || 'stripe'}
                    playerRegistrationFee={gameData?.player_registration_fee || 0}
                    perGameFee={gameData?.cash_amount || gameData?.price || 0}
                    waiverDetails={gameData?.waiver_details || ''}
                />
            </div>
        </main>
    );
}
