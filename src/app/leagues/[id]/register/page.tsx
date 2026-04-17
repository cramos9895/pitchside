import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, Users, AlertTriangle } from 'lucide-react';
import { LeagueRegistrationForm } from '@/components/public/LeagueRegistrationForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LeagueRegistrationPage({
    params,
    searchParams
}: {
    params: { id: string },
    searchParams: { type?: string; role?: string }
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Map role to type if type is missing
    const registrationType = searchParams?.type || (searchParams?.role === 'free_agent' ? 'free_agent' : 'team');

    if (!user) {
        redirect(`/login?redirect=/leagues/${params.id}/register?type=${registrationType}`);
    }

    const type = searchParams?.type === 'free_agent' ? 'free_agent' : 'team';

    // Fetch league info from 'leagues' table
    const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select(`
            id, 
            name, 
            description,
            format, 
            match_day, 
            registration_cutoff, 
            status,
            price_per_team,
            team_price,
            price,
            price_per_free_agent,
            free_agent_price,
            player_registration_fee,
            payment_collection_type,
            cash_fee_structure,
            cash_amount,
            strict_waiver_required,
            waiver_details
        `)
        .eq('id', params.id)
        .single();

    let league = leagueData;

    // If not found in 'leagues', check 'games'
    if (!league) {
        const { data: gameData } = await supabase
            .from('games')
            .select(`
                id, 
                title, 
                description,
                game_format, 
                match_style, 
                registration_cutoff:roster_lock_date, 
                status,
                team_price,
                free_agent_price,
                player_registration_fee,
                payment_collection_type,
                cash_fee_structure,
                cash_amount,
                strict_waiver_required,
                waiver_details
            `)
            .eq('id', params.id)
            .eq('event_type', 'league')
            .single();
        league = gameData as any;
    }

    if (!league) {
        return (
            <div className="min-h-screen bg-pitch-black text-white flex items-center justify-center p-4">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-pitch-accent mx-auto mb-4" />
                    <h1 className="text-2xl font-black uppercase tracking-widest mb-2">League Not Found</h1>
                    <Link href="/schedule" className="text-pitch-secondary hover:text-white transition-colors uppercase text-xs font-bold tracking-widest border-b border-white/20 pb-1">Return to Schedule</Link>
                </div>
            </div>
        );
    }

    // Check cutoff
    const isPastCutoff = league.registration_cutoff && new Date() > new Date(league.registration_cutoff);
    const isClosed = league.status === 'cancelled' || league.status === 'completed';

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pt-32 px-4 pb-20">
            <div className="max-w-2xl mx-auto">
                <Link 
                    href={`/leagues/${params.id}`}
                    className="inline-flex items-center text-pitch-secondary hover:text-white transition-colors text-xs font-black uppercase tracking-[0.2em] group mb-8"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to League
                </Link>

                <div className="mb-10 pb-8 border-b border-white/5">
                    <div className="flex items-center gap-2 text-pitch-accent text-[10px] font-black uppercase tracking-widest mb-3">
                        {type === 'team' ? <Trophy className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        {type === 'team' ? 'Team Captain Registration' : 'Free Agent Registration'}
                    </div>
                    <h1 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter leading-none mb-4">
                        {league.name}
                    </h1>
                    <div className="flex gap-4">
                        {league.format && <span className="text-xs uppercase bg-white/5 px-2 py-0.5 rounded-sm text-gray-400 font-bold border border-white/5 tracking-widest">{league.format}</span>}
                        {league.match_day && <span className="text-xs uppercase bg-white/5 px-2 py-0.5 rounded-sm text-gray-400 font-bold border border-white/5 tracking-widest">{league.match_day}</span>}
                    </div>
                </div>

                {isPastCutoff || isClosed ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-sm text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-black uppercase tracking-widest text-red-500 mb-2">Registration Closed</h2>
                        <p className="text-sm text-red-400/80 mb-6">The deadline to register for this league has passed.</p>
                        <Link href="/schedule" className="inline-block px-6 py-3 bg-red-500 text-white font-black uppercase tracking-widest text-xs hover:bg-red-400 transition-colors">
                            View Open Leagues
                        </Link>
                    </div>
                ) : (
                    <LeagueRegistrationForm league={league} type={type} />
                )}
            </div>
        </div>
    );
}
