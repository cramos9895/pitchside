import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { LeagueRegistrationClient } from './LeagueRegistrationClient';
import { Suspense } from 'react';

export const revalidate = 0; // Dynamic data

export default async function LeagueRegistrationPage({ params, searchParams }: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ type?: string }>
}) {
    const supabase = await createClient();
    const { id: leagueId } = await params;
    
    // Require authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/login?next=/leagues/${leagueId}/register`);
    }

    // Since Pitchside architecture has events in both 'games' (Rolling Leagues) and 'leagues' (Structured),
    // we robustly check both tables.
    let leagueName = '';
    let teamPrice: number | null = null;
    let faPrice: number | null = null;
    let deposit: number | null = null;

    const { data: gameLeague } = await supabase
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
            waiver_details,
            league_format
        `)
        .eq('id', leagueId)
        .eq('event_type', 'league')
        .single();

    let details: any = {};

    if (gameLeague) {
        leagueName = gameLeague.title;
        teamPrice = gameLeague.team_price;
        faPrice = gameLeague.free_agent_price;
        deposit = gameLeague.deposit_amount;
        details = {
            signup_fee: gameLeague.player_registration_fee,
            cash_amount: gameLeague.cash_amount,
            payment_collection_type: gameLeague.payment_collection_type,
            description: gameLeague.rules_description,
            strict_waiver_required: gameLeague.strict_waiver_required,
            waiver_details: gameLeague.waiver_details,
            isRolling: gameLeague.league_format === 'rolling'
        };
    } else {
        const { data: structuredLeague } = await supabase
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
            .eq('id', leagueId)
            .single();

        if (structuredLeague) {
            leagueName = structuredLeague.name || '';
            teamPrice = structuredLeague.price_per_team;
            faPrice = structuredLeague.price_per_free_agent;
            deposit = structuredLeague.deposit_amount;
            details = {
                signup_fee: structuredLeague.player_registration_fee,
                cash_amount: structuredLeague.cash_amount,
                payment_collection_type: structuredLeague.payment_collection_type,
                description: structuredLeague.description,
                strict_waiver_required: structuredLeague.strict_waiver_required,
                waiver_details: structuredLeague.waiver_details
            };
        } else {
            console.error('League not found in either games or leagues tables.');
            notFound();
        }
    }

    return (
        <main className="bg-pitch-black min-h-screen pt-32 px-4 pb-24">
            <div className="max-w-3xl mx-auto border-t-4 pt-8" style={{ borderColor: '#cbff00' }}>
                <Suspense fallback={<div className="animate-pulse border border-[#cbff00] bg-black h-96 w-full rounded-md" />}>
                    <LeagueRegistrationClient 
                        leagueId={leagueId}
                        leagueName={leagueName}
                        teamPrice={teamPrice}
                        faPrice={faPrice}
                        dbDepositAmount={deposit}
                        userId={user.id}
                        {...details}
                    />
                </Suspense>
            </div>
        </main>
    );
}
