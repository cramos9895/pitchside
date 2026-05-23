'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Clock, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandingsTable } from '@/components/admin/StandingsTable';

export default function TournamentDisplay({ params }: { params: Promise<{ id: string }> }) {
    // Robust parameter extraction with client-side fallback
    const resolvedParams = use(params);
    const gameId = resolvedParams?.id || (typeof window !== 'undefined' ? window.location.pathname.split('/')[3] : '');
    const supabase = useMemo(() => createClient(), []);
    const [game, setGame] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [view, setView] = useState<'standings' | 'matches'>('standings');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch Initial Data
    const fetchData = async () => {
        try {
            let gameData = null;
            let gameError = null;
            try {
                const res = await supabase.from('games').select('*').eq('id', gameId).single();
                gameData = res.data;
                gameError = res.error;
                
                // Self-healing retry for Safari/session recovery delays
                if ((gameError || !gameData) && typeof window !== 'undefined') {
                    console.warn("First fetch failed, retrying in 1s...", gameError);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const retry = await supabase.from('games').select('*').eq('id', gameId).single();
                    gameData = retry.data;
                    gameError = retry.error;
                }
            } catch (err: any) {
                if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                    console.warn("[display/page.tsx] Game query was aborted");
                    return;
                }
                throw err;
            }

            if (gameError) {
                if (gameError.message && (gameError.message.includes('abort') || gameError.message.includes('Abort'))) {
                    console.warn("[display/page.tsx] AbortError detected in games query, ignoring");
                } else {
                    setError(gameError.message);
                }
            } else {
                setError(null);
            }

            let matchesData = [];
            try {
                const res = await supabase.from('matches').select('*').eq('game_id', gameId).order('start_time', { ascending: true });
                matchesData = res.data || [];
            } catch (err: any) {
                if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                    console.warn("[display/page.tsx] Matches query was aborted");
                } else {
                    throw err;
                }
            }
            
            if (gameData) setGame(gameData);
            if (matchesData.length > 0) setMatches(matchesData);
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                console.warn("[display/page.tsx] FetchData was aborted, ignoring");
                return;
            }
            console.error("Display Fetch Error:", err);
            setError(err.message || 'Unknown fetch error');
        } finally {
            setLoading(false);
        }
    };

    // 1. Initial Fetch
    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            try {
                try {
                    await supabase.auth.getSession();
                } catch (authErr) {
                    console.warn("[display/page.tsx] Auth session recovery failed:", authErr);
                }
                if (isMounted) {
                    await fetchData();
                }
            } catch (err) {
                console.error("Display Init Error:", err);
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        init();
        return () => {
            isMounted = false;
        };
    }, [gameId]);

    // 2. Real-time Sync
    useEffect(() => {
        if (!gameId || loading) return;

        const channel = supabase.channel('display-sync-' + gameId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `game_id=eq.${gameId}` }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId, loading]);

    // 3. View Rotation (every 15 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            setView(prev => prev === 'standings' ? 'matches' : 'standings');
        }, 15000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-pitch-accent gap-4">
            <Loader2 className="w-12 h-12 animate-spin" />
            <div className="text-sm font-black uppercase tracking-[0.5em] animate-pulse">Initializing Broadcast Feed...</div>
        </div>
    );

    if (!game) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-red-500 uppercase tracking-widest font-bold">
            <div>Tournament Not Found</div>
            {error && (
                <p className="text-sm text-pitch-secondary bg-white/5 border border-white/10 px-4 py-2 rounded normal-case tracking-normal font-medium">
                    Error: {error}
                </p>
            )}
        </div>
    );

    const activeMatches = matches.filter(m => m.status === 'active' || (m.status === 'scheduled' && new Date(m.start_time) <= new Date()));
    const upcomingMatches = matches.filter(m => m.status === 'scheduled' && new Date(m.start_time) > new Date()).slice(0, 6);

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans overflow-hidden select-none cursor-none">
            {/* Header */}
            <div className="flex justify-between items-end border-b-2 border-pitch-accent/30 pb-6 mb-8">
                <div>
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter text-white">
                        {game.title} <span className="text-pitch-accent animate-pulse">Live</span>
                    </h1>
                    <div className="flex items-center gap-6 mt-2">
                        <div className="text-2xl font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-6 h-6 text-pitch-accent" /> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-2xl font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-yellow-500" /> {game.tournament_style?.replace('_', ' ')}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs font-black uppercase tracking-[0.3em] text-pitch-secondary mb-1">Broadcasting From</div>
                    <div className="text-3xl font-black italic uppercase tracking-tight">Pitch Side <span className="text-pitch-accent">HQ</span></div>
                </div>
            </div>

            {/* Main Content Carousel */}
            <div className="relative h-[calc(100vh-220px)] overflow-hidden">
                {view === 'standings' && (
                    <div className="animate-in fade-in zoom-in-95 duration-1000 h-full">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-4xl font-black italic uppercase text-white flex items-center gap-3">
                                <Trophy className="w-8 h-8 text-yellow-500" /> Tournament Standings
                            </h2>
                            <div className="bg-pitch-accent/10 border border-pitch-accent/30 px-4 py-1 rounded text-pitch-accent text-xs font-black uppercase tracking-widest">
                                Top {game.teams_into_playoffs || 4} Advance
                            </div>
                        </div>
                        <StandingsTable 
                            gameId={gameId}
                            teams={game.teams_config || []}
                            matches={matches}
                            viewOnly={true}
                            teamsIntoPlayoffs={game.teams_into_playoffs || 4}
                        />
                    </div>
                )}

                {view === 'matches' && (
                    <div className="animate-in slide-in-from-right duration-1000 h-full grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <h2 className="text-4xl font-black italic uppercase text-pitch-accent mb-6 flex items-center gap-4">
                                <span className="w-4 h-4 rounded-full bg-pitch-accent animate-ping" /> Current Games
                            </h2>
                            <div className="space-y-6">
                                {activeMatches.length === 0 ? (
                                    <div className="bg-white/5 border border-dashed border-white/10 p-20 rounded-lg text-center flex flex-col items-center justify-center">
                                         <Clock className="w-12 h-12 text-gray-700 mb-4" />
                                         <p className="text-2xl text-gray-600 font-bold uppercase tracking-widest italic">Intermission In Progress</p>
                                    </div>
                                ) : (
                                    activeMatches.map(m => (
                                        <div key={m.id} className="bg-white/5 border border-white/10 p-8 rounded-lg flex items-center justify-between shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-pitch-accent" />
                                            <div className="flex-1 text-center">
                                                <div className="text-4xl font-black uppercase truncate text-white">{m.home_team}</div>
                                            </div>
                                            <div className="px-10 flex flex-col items-center justify-center bg-black/40 rounded-xl py-4 mx-4 border border-white/5">
                                                <div className="flex items-center gap-6">
                                                    <div className="text-7xl font-black text-pitch-accent tabular-nums tracking-tighter">{m.home_score || 0}</div>
                                                    <div className="text-3xl font-black text-gray-700 italic">:</div>
                                                    <div className="text-7xl font-black text-pitch-accent tabular-nums tracking-tighter">{m.away_score || 0}</div>
                                                </div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mt-2">{m.field_name}</div>
                                            </div>
                                            <div className="flex-1 text-center">
                                                <div className="text-4xl font-black uppercase truncate text-white">{m.away_team}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-4xl font-black italic uppercase text-white/40 mb-6 flex items-center gap-3">
                                Upcoming Fixtures
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {upcomingMatches.length === 0 ? (
                                    <div className="bg-white/5 border border-white/10 p-12 rounded-lg text-center opacity-50">
                                         <p className="text-xl text-gray-600 font-bold uppercase tracking-widest">No scheduled matches remaining</p>
                                    </div>
                                ) : (
                                    upcomingMatches.map(m => (
                                        <div key={m.id} className="bg-white/5 border border-white/10 p-5 rounded-lg flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                                             <div className="flex items-center gap-6">
                                                <div className="w-24 font-mono text-2xl text-pitch-secondary border-r border-white/10 py-1">
                                                    {new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="flex items-center gap-4 text-2xl font-bold">
                                                    <span className="uppercase text-white">{m.home_team}</span>
                                                    <span className="text-gray-600 text-sm italic">VS</span>
                                                    <span className="uppercase text-white">{m.away_team}</span>
                                                </div>
                                             </div>
                                             <div className="flex items-center gap-2 text-gray-400 font-black uppercase text-[10px] tracking-widest bg-white/10 px-4 py-2 rounded-full border border-white/5">
                                                <MapPin className="w-3 h-3 text-pitch-accent" /> {m.field_name}
                                             </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Ticker */}
            <div className="fixed bottom-0 left-0 right-0 bg-pitch-accent text-black py-4 overflow-hidden shadow-[0_-10px_40px_rgba(204,255,0,0.2)]">
                <div className="flex animate-[ticker_40s_linear_infinite] whitespace-nowrap gap-24 items-center">
                    {[1, 2].map(i => (
                        <div key={i} className="flex gap-24 items-center">
                            <span className="font-black italic uppercase text-2xl flex items-center gap-4">
                                <Trophy className="w-6 h-6" /> Pitch Side Tournament Engine
                            </span>
                            <span className="font-bold uppercase text-lg opacity-30">/</span>
                            <span className="font-black italic uppercase text-2xl">Automatic Leaderboard Sync Enabled</span>
                            <span className="font-bold uppercase text-lg opacity-30">/</span>
                            <span className="font-black italic uppercase text-2xl underline decoration-4 underline-offset-8">Please check into your designated fields 5 mins before kick-off</span>
                            <span className="font-bold uppercase text-lg opacity-30">/</span>
                            <span className="font-black italic uppercase text-2xl">{game.title} - Final Rounds Today</span>
                            <span className="font-bold uppercase text-lg opacity-30">/</span>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                body {
                    background-color: black;
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
}
