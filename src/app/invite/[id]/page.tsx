import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { InviteClient } from './InviteClient';

export const revalidate = 0;

interface PageProps {
    params: {
        id: string;
    }
}

export default async function InvitePage({ params }: PageProps) {
    const supabase = await createClient();
    const { id: teamId } = await params;
    
    console.log('Invite Page Hit for teamId:', teamId);

    // 1. Auth Check - Redirect with callback
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/login?callbackUrl=/invite/${teamId}`);
    }

    // 2. Fetch Team and Tournament Data
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .select(`
            id,
            name,
            game_id,
            league_id
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

    // 3. Fetch Tournament Details & Current Roster Count
    let tournamentName = '';
    let totalFee = 0;
    
    const { data: gameData } = await supabase
        .from('games')
        .select('title, team_price, min_players_per_team, max_players_per_team')
        .eq('id', tournamentId)
        .single();

    if (gameData) {
        tournamentName = gameData.title;
        totalFee = gameData.team_price || 0;
    } else {
        const { data: leagueData } = await supabase
            .from('leagues')
            .select('name, price_per_team')
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
        .eq('team_id', teamId);

    // 4.5 Fetch Captain Name
    const { data: captainReg } = await supabase
        .from('tournament_registrations')
        .select('payment_status, profiles(full_name)')
        .eq('team_id', teamId)
        .eq('role', 'captain')
        .single();

    const captainName = (captainReg?.profiles as any)?.full_name || 'Your Captain';

    // 5. Check if Team is Full Pay
    // Note: In this architecture, payment splitting is usually determined by the existence of a deposit or the choice of the captain.
    // For now, we check tournament_registrations to see if ANYONE has paid. 
    // Simplified: If team_price > 0 and no 'full_pay' mark on teams yet, we treat as split.
    // BUT the prompt says "Graceful fallback if captain covered whole fee".
    // We'll check the captain's registration status.
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
                />
            </div>
        </main>
    );
}
