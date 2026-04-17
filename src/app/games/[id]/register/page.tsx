import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Zap, AlertTriangle } from 'lucide-react';
import { RollingRegistrationClient } from '@/components/public/RollingRegistrationClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🏗️ Architecture: [[RollingLeagueLobby.md]]
 * Specialized registration route for "Rolling Leagues" which are stored in the 'games' table.
 */

export default async function RollingLeagueRegistrationPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ type?: string; role?: string }>
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const gameId = resolvedParams.id;
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Map role to type if type is missing
    const registrationType = resolvedSearchParams?.type || (resolvedSearchParams?.role === 'free_agent' ? 'free_agent' : 'team');

    if (!user) {
        redirect(`/login?redirect=/games/${gameId}/register?type=${registrationType}`);
    }

    const type = registrationType === 'free_agent' ? 'free_agent' : 'team';

    // Fetch game info - casting to Rolling League format
    const { data: gameData, error: gameError } = await supabase
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
            waiver_details,
            league_format
        `)
        .eq('id', gameId)
        .single();

    if (gameError || !gameData) {
        return (
            <div className="min-h-screen bg-pitch-black text-white flex items-center justify-center p-4">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-pitch-accent mx-auto mb-4" />
                    <h1 className="text-2xl font-black uppercase tracking-widest mb-2">League Not Found</h1>
                    <p className="text-pitch-secondary text-sm mb-6">We couldn't find the Rolling League you're looking for.</p>
                    <Link href="/schedule" className="text-pitch-accent hover:text-white transition-colors uppercase text-xs font-black tracking-widest border-b-2 border-pitch-accent pb-1">Return to Schedule</Link>
                </div>
            </div>
        );
    }

    // Map game fields to satisfies the League interface
    const mappedLeague = {
        ...gameData,
        name: gameData.title // Component expects .name
    };

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans">
            <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
                <Link href={`/games/${gameId}`} className="group inline-flex items-center text-pitch-secondary hover:text-white mb-12 transition-colors uppercase text-[10px] font-black tracking-[0.2em]">
                    <ArrowLeft className="w-3 h-3 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Lobby
                </Link>



                <div className="bg-pitch-card border border-white/10 rounded-sm p-6 md:p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pitch-accent/5 blur-3xl -mr-16 -mt-16 rounded-full" />
                    <RollingRegistrationClient 
                        league={gameData as any} 
                        type={type as any} 
                    />
                </div>
            </div>
        </div>
    );
}
