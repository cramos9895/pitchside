"use client"

import { useEffect, useState, use, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { StandingsTable } from '@/components/admin/StandingsTable';

interface Game {
    id: string;
    title: string;
    status: string;
    view_mode: string;
    match_style?: string;
    facility_id?: string | null;
    resource_id?: string | null;
    timer_status: 'stopped' | 'running' | 'paused';
    timer_duration: number;
    timer_started_at: string | null;
    teams_config: any[];
    half_length?: number;
}

interface Match {
    id: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    round_number: number;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    field_name?: string;
}

export default function LiveProjectorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: gameId } = use(params);
    const supabase = createClient();

    const [game, setGame] = useState<Game | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    // The Unified, Uncached Refetch
    const refreshData = async () => {
        const { data: freshGame } = await supabase.from('games').select('*').eq('id', gameId).single();
        const matchesRes = await fetch(`/api/matches?gameId=${gameId}`);
        const matchesResult = await matchesRes.json();
        const freshMatches = matchesResult.data || [];

        if (freshGame) {
            setGame(freshGame);
            calculateInitialTime(freshGame);
        }
        setMatches(freshMatches);
    };

    // Keep function hoisted so it can be called anywhere
    function calculateInitialTime(g: Game | any) {
        const hLen = g?.half_length || 0;
        const standardDuration = hLen > 0 ? hLen * 60 : (g?.timer_duration || 0);
        
        if (g?.timer_status === 'stopped' || g?.timer_status === 'paused') {
            setTimeRemaining(standardDuration);
        } else if (g?.timer_status === 'running' && g?.timer_started_at) {
            const startTime = new Date(g.timer_started_at).getTime();
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const duration = (g?.timer_duration || 0) > 0 ? g.timer_duration : standardDuration;
            setTimeRemaining(Math.max(0, duration - elapsedSeconds));
        }
    }

    // Initial Fetch
    useEffect(() => {
        refreshData().then(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, supabase]);

    // Realtime Subscriptions (Tripwire Architecture)
    useEffect(() => {
        if (!gameId) return;

        const channel = supabase.channel(`live-projector-${gameId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (payload) => {
                console.log("🚨 TRIPWIRE: GAMES TABLE EVENT:", payload.eventType, payload);
                refreshData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `game_id=eq.${gameId}` }, (payload) => {
                console.log("🚨 TRIPWIRE: MATCHES TABLE EVENT:", payload.eventType, payload);
                refreshData();
            })
            .subscribe((status) => {
                console.log("📡 SUBSCRIPTION STATUS:", status);
            });

        // CRITICAL: Cleanup function to prevent ghost channels
        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId]); // ONLY depend on gameId, nothing else.

    // Timer Heartbeat (Bulletproof Ref Pattern)
    const gameRef = useRef(game);
    useEffect(() => {
        gameRef.current = game;
    }, [game]);

    useEffect(() => {
        const interval = setInterval(() => {
            const g = gameRef.current;
            if (!g) return;

            if (g.timer_status === 'running' && g.timer_started_at) {
                const elapsed = Math.floor((Date.now() - new Date(g.timer_started_at).getTime()) / 1000);
                const hLen = g.half_length || 0;
                const duration = g.timer_duration > 0 ? g.timer_duration : (hLen * 60);
                setTimeRemaining(Math.max(0, duration - elapsed));
            } else {
                // Stopped/Paused: Force Sync to Half Length if available
                const hLen = g.half_length || 0;
                const standard = hLen > 0 ? (hLen * 60) : (g.timer_duration || 0);
                setTimeRemaining(standard);
            }
        }, 1000); // Ticks every second, reading fresh data directly from the ref

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-24 h-24 text-pitch-accent animate-spin" />
            </div>
        );
    }

    if (!game) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <h1 className="text-4xl text-white font-bold">Game Not Found</h1>
            </div>
        );
    }

    // Normalize View Mode based on match_style and fallback to view_mode
    const effectiveMode = (() => {
        const style = game.match_style;
        if (style === 'King') return 'king';
        if (style === 'Tourney') return 'tournament';
        if (style === 'Full Length') return 'single';
        return game.view_mode || 'single';
    })();

    // Format Time
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const isLowTime = timeRemaining > 0 && timeRemaining <= 60; // Final minute turns red/yellow

    // Derived States
    const activeMatches = matches.filter(m => m.status !== 'completed' && m.status !== 'cancelled');

    // Determine Current Round (First valid round with scheduled/active games)
    // Filter for rounds > 0
    const validMatches = matches.filter(m => (m.round_number || 0) > 0);
    let currentRound = 0;

    if (validMatches.length > 0) {
        const sortedMatches = [...validMatches].sort((a, b) => (a.round_number || 0) - (b.round_number || 0));
        const activeMatch = sortedMatches.find(m => m.status === 'active');
        const firstScheduled = sortedMatches.find(m => m.status === 'scheduled');
        
        if (activeMatch) {
            currentRound = activeMatch.round_number || 0;
        } else if (firstScheduled) {
            currentRound = firstScheduled.round_number || 0;
        } else {
            const max = sortedMatches.reduce((acc, m) => Math.max(acc, m.round_number || 0), 0);
            currentRound = max;
        }
    }

    const matchesInCurrentRound = matches.filter(m => m.round_number === currentRound);

    // Up Next Queue
    const roundsWithScheduledMatches = Array.from(new Set(matches.filter(m => m.status === 'scheduled').map(m => m.round_number))).sort((a, b) => a - b);
    const nextAvailableRound = roundsWithScheduledMatches.find(r => r > currentRound) || 0;
    const upcomingMatches = matches.filter(m => m.status === 'scheduled' && m.round_number === nextAvailableRound);

    // Sitting Out Logic
    const activeTeamsCurrentRound = matchesInCurrentRound.flatMap(m => [m.home_team, m.away_team]);
    const sittingOutCurrentRound = (game.teams_config || []).filter(t => !activeTeamsCurrentRound.includes(t.name));

    const activeTeamsNextRound = upcomingMatches.flatMap(m => [m.home_team, m.away_team]);
    const sittingOutNextRound = (game.teams_config || []).filter(t => !activeTeamsNextRound.includes(t.name));

    // --- VIEW RENDERERS ---

    const renderTimer = () => {
        const isTournament = effectiveMode === 'tournament' || effectiveMode === 'king';
        return (
            <div className={cn("text-center w-full shrink-0", isTournament ? "mb-0" : "mb-8")}>
                <div className={cn(
                    isTournament ? "font-black tracking-tighter tabular-nums text-white drop-shadow-2xl" : "font-mono font-black tracking-tighter tabular-nums transition-colors duration-500",
                    !isTournament && (game.timer_status === 'paused' ? "animate-pulse text-gray-500" :
                    timeRemaining === 0 && game.timer_status !== 'stopped' ? "text-red-600 animate-pulse" :
                        isLowTime ? "text-yellow-500" : "text-white drop-shadow-2xl")
                )}
                    style={{ 
                        fontSize: isTournament ? 'clamp(4rem, 13vh, 8.5rem)' : 'clamp(8rem, 18vw, 15rem)',
                        lineHeight: '1.1',
                        marginBlock: '0'
                    }}
                >
                    {timeDisplay}
                </div>
                {game.timer_status === 'paused' && (
                    <div className={cn("font-bold uppercase tracking-widest text-gray-500 mt-2 shrink-0", isTournament ? "text-xl lg:text-2xl" : "text-4xl")}>PAUSED</div>
                )}
                {timeRemaining === 0 && game.timer_status !== 'stopped' && (
                    <div className={cn("font-black uppercase tracking-widest text-red-600 mt-2 italic shrink-0", isTournament ? "text-2xl lg:text-4xl" : "text-6xl")}>TIME!</div>
                )}
            </div>
        );
    };

    // SINGLE VIEW
    const renderSingleMode = () => (
        <div className="flex-1 flex flex-col items-center justify-center p-8 h-full min-h-0 relative z-10 w-full">
            {renderTimer()}
            <div className="w-full max-w-6xl mt-8 shrink-0">
                <div className="flex items-center justify-between w-full bg-white/5 border border-white/10 rounded-3xl p-16 backdrop-blur-sm shadow-2xl">
                    <div className="text-3xl lg:text-4xl font-black uppercase tracking-tighter w-[40%] text-right text-gray-200 drop-shadow-lg break-words whitespace-normal leading-tight">
                        {game.teams_config && game.teams_config.length > 0 ? game.teams_config[0].name : "Team A"}
                    </div>
                    <div className="text-3xl lg:text-4xl font-black text-pitch-accent italic w-[20%] text-center opacity-70">
                        VS
                    </div>
                    <div className="text-3xl lg:text-4xl font-black uppercase tracking-tighter w-[40%] text-left text-gray-200 drop-shadow-lg break-words whitespace-normal leading-tight">
                        {game.teams_config && game.teams_config.length > 1 ? game.teams_config[1].name : "Team B"}
                    </div>
                </div>
            </div>
        </div>
    );

    // KING VIEW
    const renderKingMode = () => {
        const activeMatch = matches?.find(m => m.status === 'active') || matches?.find(m => m.status === 'scheduled');

        return (
            <div className="flex-1 grid grid-cols-12 gap-8 min-h-0 p-8 relative z-10 w-full">
                {/* Left Column (Timer & Teams - 60%) */}
                <div className="col-span-7 flex flex-col justify-center items-center h-full min-h-0">
                    {renderTimer()}
                    <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-md shrink-0">
                        <h2 className="text-2xl font-bold text-gray-400 uppercase tracking-widest mb-6 text-center flex items-center justify-center gap-4">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            Active Match {activeMatch?.round_number ? `(Round ${activeMatch.round_number})` : ''}
                        </h2>
                        <div className="flex items-center justify-between px-6 py-6 bg-black/40 rounded-2xl border border-white/5 relative z-20">
                            <div className="text-2xl lg:text-4xl font-black uppercase tracking-tighter w-[40%] text-right text-gray-200 break-words whitespace-normal leading-tight">
                                {activeMatch?.home_team || (game.teams_config && game.teams_config.length > 0 ? game.teams_config[0].name : "Team A")}
                            </div>
                            <div className="text-xl lg:text-3xl font-bold text-pitch-accent italic w-[20%] text-center flex-shrink-0">
                                VS
                            </div>
                            <div className="text-2xl lg:text-4xl font-black uppercase tracking-tighter w-[40%] text-left text-gray-200 break-words whitespace-normal leading-tight">
                                {activeMatch?.away_team || (game.teams_config && game.teams_config.length > 1 ? game.teams_config[1].name : "Team B")}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column (Standings & Queue - 40%) */}
                <div className="col-span-5 flex flex-col h-full min-h-0 gap-6">
                    <div className="flex-1 min-h-[50%] overflow-hidden flex flex-col bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md relative z-20">
                        <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest mb-4 shrink-0">Standings</h2>
                        <div className="flex-1 min-h-0 overflow-y-auto bg-black/60 rounded-2xl border-2 border-white/20 pointer-events-none opacity-90 scale-100 origin-top [&_th]:text-sm lg:[&_th]:text-base [&_td]:text-base lg:[&_td]:text-lg [&_td]:font-bold [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-2 [&_tr]:border-b [&_tr]:border-white/20">
                            <StandingsTable gameId={gameId} teams={game.teams_config} matches={matches} />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // TOURNAMENT VIEW
    const renderTournamentMode = () => (
        <div className="flex-1 grid grid-cols-12 gap-4 lg:gap-6 h-full p-4 lg:p-4 relative z-10 w-full overflow-hidden">
            {/* Left Column (Timer, Active, Next - Span 5/12) */}
            <div className="col-span-12 lg:col-span-5 flex flex-col h-full justify-between gap-2 lg:gap-3 overflow-hidden">
                <div className="flex-1 min-h-0 flex items-center justify-center">
                    {renderTimer()}
                </div>

                <div className="shrink-0 w-full bg-white/5 border border-white/10 rounded-3xl p-4 lg:p-5 backdrop-blur-md flex flex-col relative shadow-2xl">
                    <h2 className="text-[10px] lg:text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3 text-center flex items-center justify-center gap-2 shrink-0">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        Active Match (Round {currentRound})
                    </h2>
                    {matchesInCurrentRound.length > 0 ? (
                        <div className="flex flex-col space-y-2 lg:space-y-3">
                            {matchesInCurrentRound.map(match => (
                                <div key={match.id} className="flex flex-col gap-0.5 px-6 py-2.5 lg:py-3 bg-black/40 rounded-xl border border-white/10 relative z-20 shadow-lg shrink-0">
                                    <div className="flex flex-row items-center justify-between">
                                        <div className="text-base lg:text-2xl font-black uppercase tracking-tighter flex-1 text-right text-gray-200 truncate pr-3">
                                            {match.home_team}
                                        </div>
                                        <div className="text-xs lg:text-sm font-bold text-pitch-accent italic text-center shrink-0 px-4">
                                            VS
                                        </div>
                                        <div className="text-base lg:text-2xl font-black uppercase tracking-tighter flex-1 text-left text-gray-200 truncate pl-3">
                                            {match.away_team}
                                        </div>
                                    </div>
                                    <div className="text-center text-[10px] lg:text-xs font-black text-gray-500 uppercase tracking-widest mt-1">
                                        {/* Fallback to Field Index if no name persists */}
                                        {match.field_name || (matchesInCurrentRound.length > 1 ? `Field ${matchesInCurrentRound.indexOf(match) + 1}` : "Field 1")}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-row gap-2 items-center justify-between px-3 py-1.5 bg-black/40 rounded-lg border border-white/5 relative z-20 shrink-0">
                            <div className="text-sm lg:text-base font-black uppercase tracking-tighter flex-1 text-right text-gray-200 truncate">
                                {game.teams_config && game.teams_config.length >= 2 ? game.teams_config[0].name : "Team A"}
                            </div>
                            <div className="text-[10px] font-bold text-pitch-accent italic text-center shrink-0 px-2">
                                VS
                            </div>
                            <div className="text-sm lg:text-base font-black uppercase tracking-tighter flex-1 text-left text-gray-200 truncate">
                                {game.teams_config && game.teams_config.length >= 2 ? game.teams_config[1].name : "Team B"}
                            </div>
                        </div>
                    )}
                    {sittingOutCurrentRound.length > 0 && (
                        <div className="mt-2 text-center p-2 bg-black/20 rounded-xl border border-white/5 opacity-80 shrink-0">
                            <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Bench (Sitting Out)</div>
                            <div className="text-white text-[9px] lg:text-[10px] font-bold flex flex-wrap justify-center gap-1.5">
                                {sittingOutCurrentRound.map((t, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-white/5 rounded-full border border-white/5 shadow-inner">{t.name}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {upcomingMatches.length > 0 && (
                <div className="shrink-0 w-full bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col relative shadow-xl">
                    <h2 className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 text-center border-b border-white/10 pb-2 shrink-0">Up Next (Round {nextAvailableRound})</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {upcomingMatches.map(match => (
                            <div key={match.id} className="flex flex-col gap-0.5 px-3 py-2 bg-black/40 rounded-lg border border-white/5 relative z-20">
                                <div className="flex flex-row items-center justify-center gap-2">
                                    <div className="text-[9px] lg:text-sm font-black uppercase tracking-tighter flex-1 text-right text-gray-200 truncate">
                                        {match.home_team}
                                    </div>
                                    <div className="text-[7px] lg:text-[10px] font-bold text-gray-500 uppercase text-center shrink-0">
                                        VS
                                    </div>
                                    <div className="text-[9px] lg:text-sm font-black uppercase tracking-tighter flex-1 text-left text-gray-200 truncate">
                                        {match.away_team}
                                    </div>
                                </div>
                                <div className="text-center text-[7px] lg:text-[9px] font-bold text-pitch-secondary uppercase tracking-[0.2em] opacity-70">
                                    {match.field_name || (upcomingMatches.length > 1 ? `Field ${upcomingMatches.indexOf(match) + 1}` : "Field 1")}
                                </div>
                            </div>
                        ))}
                    </div>
                    {sittingOutNextRound.length > 0 && (
                        <div className="mt-2 text-center text-[8px] lg:text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                            Bench Next: <span className="text-white/60">{sittingOutNextRound.map(t => t.name).join(', ')}</span>
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* Right Column (Standings - Span 7/12) */}
            <div className="col-span-12 lg:col-span-7 flex flex-col h-full overflow-visible">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 lg:p-4 backdrop-blur-md relative z-20 shadow-xl h-full flex flex-col">
                    <div className="bg-black/80 rounded-2xl border border-white/10 shadow-2xl flex flex-col flex-1">
                        <StandingsTable gameId={gameId} teams={game.teams_config} matches={matches} viewOnly={true} />
                    </div>
                </div>
            </div>
        </div>
    );


    return (
        <div className="fixed inset-0 overflow-hidden box-border flex flex-col bg-slate-900 text-white font-sans">
            {/* TOP BAR: Title & Status */}
            <div className="px-6 py-4 lg:px-8 lg:py-4 border-b border-white/10 flex items-center justify-between opacity-90 backdrop-blur-md bg-black/60 z-20 flex-shrink-0 w-full shadow-lg">
                <h1 className="text-2xl lg:text-3xl font-heading font-black italic tracking-tighter text-pitch-accent uppercase">
                    PITCH<span className="text-white">SIDE</span>
                </h1>
                <div className="text-lg lg:text-xl font-bold text-gray-400 capitalize">
                    {effectiveMode === 'tournament' ? 'Tourney' : effectiveMode} Mode
                </div>
            </div>

            {/* BACKGROUND WATERMARK */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none z-0">
                <h1 className="text-[15rem] lg:text-[20rem] font-heading font-black italic tracking-tighter text-white uppercase transform -rotate-12">
                    PITCHSIDE
                </h1>
            </div>

            {/* MAIN CONTENT AREA */}
            {effectiveMode === 'single' && renderSingleMode()}
            {effectiveMode === 'king' && renderKingMode()}
            {effectiveMode === 'tournament' && renderTournamentMode()}
        </div>
    );
}
