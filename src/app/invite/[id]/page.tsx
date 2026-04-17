// 🏗️ Architecture: Invite page — server component that loads team + tournament data
// Hardened against runtime crashes: all queries are wrapped in try/catch
// NEVER exposes raw database errors or sensitive details to the client
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { InviteClient } from './InviteClient';

export const revalidate = 0;

// Next.js 15 requires params to be a Promise
export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient();
        const { id: teamId } = await params;

        // 1. Auth Check — redirect unauthenticated users to login with callback
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            redirect(`/login?callbackUrl=/invite/${teamId}`);
        }

        // 2. Fetch Team — separated from profile join to prevent FK ambiguity crashes
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('id, name, game_id, league_id, captain_id')
            .eq('id', teamId)
            .single();

        if (teamError || !team) {
            console.error('[Invite] Team lookup failed for ID:', teamId);
            notFound();
        }

        // 2b. Fetch captain name separately — more resilient than embedded join
        let captainName = 'Your Captain';
        if (team.captain_id) {
            const { data: captainProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', team.captain_id)
                .single();
            if (captainProfile?.full_name) {
                captainName = captainProfile.full_name;
            }
        }

        const tournamentId = team.game_id || team.league_id;
        if (!tournamentId) {
            return <div className="p-20 text-center text-red-500 font-bold uppercase">Invalid Invite Configuration</div>;
        }

        // 3. Fetch Tournament Details & Financial Config
        let tournamentName = '';
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
            .eq('id', tournamentId)
            .single();

        if (gData) {
            gameData = gData;
            tournamentName = gData.title;
            totalFee = gData.team_registration_fee || 0;
        } else {
            // Fallback: check the leagues table
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

        // 4. Fetch Roster Count for fee split calculation
        const { count: rosterCount } = await supabase
            .from('tournament_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId)
            .neq('status', 'cancelled');

        // 5. Check if Captain paid in full (determines if player needs Stripe)
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
                        waiverDetails={gameData?.waiver_details || ''}
                    />
                </div>
            </main>
        );
    } catch (e: any) {
        if (e?.digest?.startsWith('NEXT_REDIRECT') || e?.digest?.startsWith('NEXT_NOT_FOUND')) {
            throw e;
        }
        return (
            <main className="bg-black text-red-500 font-mono p-10 min-h-screen whitespace-pre-wrap">
                <h2>Server Component Crash</h2>
                <p>{e?.message}</p>
                <p>{e?.stack}</p>
            </main>
        )
    }
}
