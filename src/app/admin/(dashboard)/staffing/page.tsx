import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const revalidate = 0;

export default async function StaffingDispatchBoard() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
            },
        }
    );

    // Fetch upcoming matches (excluding pickup), join match_officials & games
    // For production we'd filter start_time > now(), but we'll fetch all non-pickup matches ordered by time
    const { data: matches, error } = await supabase
        .from('matches')
        .select(`
            id,
            game_id,
            home_team,
            away_team,
            start_time,
            scheduled_time,
            games!inner(event_type, title, requires_officials),
            match_officials(
                id,
                role,
                status,
                profiles(first_name, last_name)
            )
        `)
        .neq('games.event_type', 'pickup')
        .eq('games.requires_officials', true)
        .order('scheduled_time', { ascending: true, nullsFirst: false });

    if (error) {
        console.error('Error fetching staffing matches:', error);
        return <div className="p-12 text-white">Error loading staffing data.</div>;
    }

    // Group matches by Date
    const groupedMatches: Record<string, any[]> = {};
    
    matches?.forEach((match: any) => {
        const dateStr = match.scheduled_time || match.start_time;
        if (!dateStr) return;
        
        // Group by local date string
        const dateObj = new Date(dateStr);
        const dayKey = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        
        if (!groupedMatches[dayKey]) {
            groupedMatches[dayKey] = [];
        }
        groupedMatches[dayKey].push(match);
    });

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-24">
            <header className="border-b border-white/10 pb-8 flex items-center gap-4">
                <ShieldAlert className="w-10 h-10 text-[#cbff00]" />
                <div>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight text-white">
                        Global <span className="text-[#cbff00]">Staffing</span> Board
                    </h1>
                    <p className="text-gray-400 font-medium uppercase tracking-widest text-sm mt-2">
                        Master Dispatch & Coverage Matrix
                    </p>
                </div>
            </header>

            {Object.keys(groupedMatches).length === 0 ? (
                <div className="p-12 border border-white/10 bg-white/5 rounded-sm text-center">
                    <p className="text-gray-500 font-medium">No upcoming matches require staffing.</p>
                </div>
            ) : (
                Object.entries(groupedMatches).map(([dateKey, dayMatches]) => (
                    <section key={dateKey} className="space-y-6">
                        <h2 className="text-2xl font-black italic uppercase text-white border-b border-white/10 pb-2">
                            {dateKey}
                        </h2>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {dayMatches.map((match) => {
                                const officials = match.match_officials || [];
                                const confirmed = officials.filter((o: any) => o.status === 'Confirmed');
                                const pending = officials.filter((o: any) => o.status === 'Pending');
                                
                                const timeStr = match.scheduled_time || match.start_time;
                                const displayTime = timeStr ? new Date(timeStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Chicago' }) : 'TBD';

                                // Determine Heatmap Status
                                let statusUI = null;
                                
                                if (confirmed.length > 0) {
                                    // STAFFED
                                    const ref = confirmed[0];
                                    statusUI = (
                                        <div className="bg-[#cbff00] text-black p-3 font-black uppercase text-sm flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Staffed
                                            </div>
                                            <span>{ref.profiles?.first_name} {ref.profiles?.last_name}</span>
                                        </div>
                                    );
                                } else if (pending.length > 0) {
                                    // ACTION REQUIRED
                                    statusUI = (
                                        <div className="bg-white text-black p-3 font-black uppercase text-sm flex items-center justify-between animate-pulse">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Action Required
                                            </div>
                                            <span>{pending.length} Pending</span>
                                        </div>
                                    );
                                } else {
                                    // UNSTAFFED
                                    statusUI = (
                                        <div className="border border-white/40 text-white p-3 font-black uppercase text-sm flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <AlertTriangle className="w-4 h-4" />
                                                Unstaffed
                                            </div>
                                            <span className="text-white">NEEDS REF</span>
                                        </div>
                                    );
                                }

                                return (
                                    <Link 
                                        href={`/admin/games/${match.game_id}?tab=officials-manager`}
                                        key={match.id} 
                                        className="block border border-white/10 bg-black hover:border-white/40 transition-colors rounded-sm overflow-hidden group"
                                    >
                                        <div className="p-5 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                                                        {displayTime} • {match.games?.title || 'Game'}
                                                    </span>
                                                    <h3 className="font-black uppercase tracking-tight text-white group-hover:text-[#cbff00] transition-colors text-lg">
                                                        {match.home_team} vs {match.away_team}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                        {statusUI}
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}
