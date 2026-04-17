import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { TournamentRegistrationClient } from './TournamentRegistrationClient';

export const revalidate = 0; // Dynamic data

// Next.js 15 requires params to be a Promise
export default async function TournamentRegistrationPage({ params, searchParams }: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ type?: string }>
}) {
    const supabase = await createClient();
    const { id } = await params;
    
    // Require authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Since Pitchside architecture has events in both 'games' (Micro-Tournaments) and 'leagues' (Multi-week),
    // we robustly check both tables to determine the name and pricing.
    let tournamentName = '';
    let teamPrice: number | null = null;
    let faPrice: number | null = null;
    let deposit: number | null = null;
    const tournamentId = (await params).id;

    const { data: gameTourney } = await supabase
        .from('games')
        .select(`
            title, 
            team_price, 
            free_agent_price, 
            deposit_amount,
            player_registration_fee,
            cash_amount,
            payment_collection_type,
            rules_description,
            strict_waiver_required,
            waiver_details
        `)
        .eq('id', tournamentId)
        .single();

    let details: any = {};

    if (gameTourney) {
        tournamentName = gameTourney.title;
        teamPrice = gameTourney.team_price;
        faPrice = gameTourney.free_agent_price;
        deposit = gameTourney.deposit_amount;
        details = {
            signup_fee: gameTourney.player_registration_fee,
            cash_amount: gameTourney.cash_amount,
            payment_collection_type: gameTourney.payment_collection_type,
            description: gameTourney.rules_description,
            strict_waiver_required: gameTourney.strict_waiver_required,
            waiver_details: gameTourney.waiver_details
        };
    } else {
        const { data: leagueTourney } = await supabase
            .from('leagues')
            .select(`
                name, 
                price_per_team, 
                price_per_free_agent, 
                deposit_amount,
                player_registration_fee,
                cash_amount,
                payment_collection_type,
                description,
                strict_waiver_required,
                waiver_details
            `)
            .eq('id', tournamentId)
            .single();

        if (leagueTourney) {
            tournamentName = leagueTourney.name || '';
            teamPrice = leagueTourney.price_per_team;
            faPrice = leagueTourney.price_per_free_agent;
            deposit = leagueTourney.deposit_amount;
            details = {
                signup_fee: leagueTourney.player_registration_fee,
                cash_amount: leagueTourney.cash_amount,
                payment_collection_type: leagueTourney.payment_collection_type,
                description: leagueTourney.description,
                strict_waiver_required: leagueTourney.strict_waiver_required,
                waiver_details: leagueTourney.waiver_details
            };
        } else {
            console.error('Tournament not found in either games or leagues tables.');
            notFound();
        }
    }

    return (
        <main className="bg-pitch-black min-h-screen pt-32 px-4 pb-24">
            <div className="max-w-3xl mx-auto border-t-4 pt-8" style={{ borderColor: '#cbff00' }}>
                <TournamentRegistrationClient 
                    tournamentId={tournamentId}
                    tournamentName={tournamentName}
                    teamPrice={teamPrice}
                    faPrice={faPrice}
                    dbDepositAmount={deposit}
                    {...details}
                />
            </div>
        </main>
    );
}
