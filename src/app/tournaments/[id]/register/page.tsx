import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { TournamentRegistrationClient } from './TournamentRegistrationClient';

export const revalidate = 0; // Dynamic data

interface PageProps {
    params: {
        id: string; 
    };
    searchParams: {
        type?: string;
    };
}

export default async function TournamentRegistrationPage({ params, searchParams }: PageProps) {
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
        .select('title, team_price, free_agent_price, deposit_amount')
        .eq('id', tournamentId)
        .single();

    if (gameTourney) {
        tournamentName = gameTourney.title;
        teamPrice = gameTourney.team_price;
        faPrice = gameTourney.free_agent_price;
        deposit = gameTourney.deposit_amount;
    } else {
        const { data: leagueTourney } = await supabase
            .from('leagues')
            .select('name, price_per_team, price_per_free_agent, deposit_amount')
            .eq('id', tournamentId)
            .single();

        if (leagueTourney) {
            tournamentName = leagueTourney.name || '';
            teamPrice = leagueTourney.price_per_team;
            faPrice = leagueTourney.price_per_free_agent;
            deposit = leagueTourney.deposit_amount;
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
                />
            </div>
        </main>
    );
}
