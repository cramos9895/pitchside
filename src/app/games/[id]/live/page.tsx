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
    facility_id?: string | null;
    resource_id?: string | null;
    timer_status: 'stopped' | 'running' | 'paused';
    timer_duration: number;
    timer_started_at: string | null;
    teams_config: any[];
}

interface Match {
    id: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    round_number: number;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
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
        const { data: freshMatches } = await supabase.from('matches').select('*').eq('game_id', gameId).order('round_number', { ascending: true });

        if (freshGame) {
            setGame(freshGame);
            calculateInitialTime(freshGame);
        }
        if (freshMatches) {
            setMatches(freshMatches);
        }
    };

    // Keep function hoisted so it can be called anywhere
    function calculateInitialTime(g: Game) {
        if (g.timer_status === 'stopped' || g.timer_status === 'paused') {
            setTimeRemaining(g.timer_duration);
        } else if (g.timer_status === 'running' && g.timer_started_at) {
            const startTime = new Date(g.timer_started_at).getTime();
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            setTimeRemaining(Math.max(0, g.timer_duration - elapsedSeconds));
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
                setTimeRemaining(Math.max(0, g.timer_duration - elapsed));
            } else {
                setTimeRemaining(g.timer_duration || 0);
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
        // Find first round that has at least one match not completed/cancelled
        const unfinishedRound = validMatches.find(m => m.status !== 'completed' && m.status !== 'cancelled')?.round_number;
        if (unfinishedRound) {
            currentRound = unfinishedRound;
        } else {
            // All finished? Set to max round + 1 to show "Done" conceptually, or just max.
            const max = validMatches.reduce((acc, m) => Math.max(acc, m.round_number || 0), 0);
            currentRound = max + 1;
        }
    }

    const matchesInCurrentRound = matches.filter(m => m.round_number === currentRound);

    // Up Next Queue
    const nextRound = currentRound + 1;
    const upcomingMatches = matches.filter(m => m.status === 'scheduled' && m.round_number === nextRound);

    // Sitting Out Logic
    const activeTeamsCurrentRound = matchesInCurrentRound.flatMap(m => [m.home_team, m.away_team]);
    const sittingOutCurrentRound = (game.teams_config || []).filter(t => !activeTeamsCurrentRound.includes(t.name));

    const activeTeamsNextRound = upcomingMatches.flatMap(m => [m.home_team, m.away_team]);
    const sittingOutNextRound = (game.teams_config || []).filter(t => !activeTeamsNextRound.includes(t.name));

    // --- VIEW RENDERERS ---

    const renderTimer = () => {
        const isTournament = game.view_mode === 'tournament' || game.view_mode === 'king';
        return (
            <div className={cn("text-center w-full shrink-0", isTournament ? "mb-2 lg:mb-4" : "mb-8")}>
                <div className={cn(
                    "font-mono font-black tracking-tighter tabular-nums transition-colors duration-500",
                    game.timer_status === 'paused' && "animate-pulse text-gray-500",
                    timeRemaining === 0 && game.timer_status !== 'stopped' ? "text-red-600 animate-pulse" :
                        isLowTime ? "text-yellow-500" : "text-white drop-shadow-2xl",
                    isTournament ? "text-[5rem] lg:text-[7rem] leading-none" : "text-[10rem] lg:text-[15rem] leading-none"
                )}
                    style={!isTournament ? { fontSize: 'clamp(8rem, 18vw, 15rem)' } : undefined}
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
        <div className="flex-1 grid grid-cols-12 gap-4 lg:gap-6 min-h-0 p-4 lg:p-6 relative z-10 w-full overflow-hidden">
            {/* Left Column (Timer, Active, Next - Span 4/12) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col h-full min-h-0 gap-3 lg:gap-4">
                <div className="shrink-0 flex items-center justify-center">
                    {renderTimer()}
                </div>

                <div className="flex-1 min-h-0 w-full bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col overflow-hidden relative">
                    <h2 className="text-sm lg:text-base font-bold text-gray-400 uppercase tracking-widest mb-3 text-center flex items-center justify-center gap-2 shrink-0">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                        Active Match {currentRound > 0 ? `(Round ${currentRound})` : ''}
                    </h2>
                    {matchesInCurrentRound.length > 0 ? (
                        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-1.5">
                            {matchesInCurrentRound.map(match => (
                                <div key={match.id} className="flex flex-row gap-2 items-center justify-between px-3 py-1.5 bg-black/40 rounded-lg border border-white/5 relative z-20">
                                    <div className="text-sm lg:text-base font-black uppercase tracking-tighter flex-1 text-right text-gray-200 truncate">
                                        {match.home_team}
                                    </div>
                                    <div className="text-[10px] font-bold text-pitch-accent italic text-center shrink-0 px-2">
                                        VS
                                    </div>
                                    <div className="text-sm lg:text-base font-black uppercase tracking-tighter flex-1 text-left text-gray-200 truncate">
                                        {match.away_team}
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
                        <div className="mt-3 text-center text-xs lg:text-sm font-bold text-gray-500 uppercase tracking-widest border-t border-white/10 pt-2 shrink-0">
                            Sitting Out: <span className="text-white text-[10px] lg:text-xs">{sittingOutCurrentRound.map(t => t.name).join(', ')}</span>
                        </div>
                    )}
                </div>

                {upcomingMatches.length > 0 && (
                    <div className="flex-1 min-h-0 w-full bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col overflow-hidden relative z-30 shadow-lg">
                        <h2 className="text-sm lg:text-base font-bold text-white uppercase tracking-widest mb-3 border-b border-white/10 pb-2 text-center shrink-0">Up Next</h2>
                        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-1.5">
                            {upcomingMatches.map(match => (
                                <div key={match.id} className="flex flex-row gap-2 items-center justify-between px-3 py-1.5 bg-black/40 rounded-lg border border-white/5 relative z-20">
                                    <div className="text-sm lg:text-base font-black uppercase tracking-tighter flex-1 text-right text-gray-200 truncate">
                                        {match.home_team}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase text-center shrink-0 px-2">
                                        VS
                                    </div>
                                    <div className="text-sm lg:text-base font-black uppercase tracking-tighter flex-1 text-left text-gray-200 truncate">
                                        {match.away_team}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {sittingOutNextRound.length > 0 && (
                            <div className="mt-2 text-center text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-widest border-t border-white/10 pt-1.5">
                                Sitting Out Next: <span className="text-white text-[10px]">{sittingOutNextRound.map(t => t.name).join(', ')}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right Column (Standings - Span 8/12) */}
            <div className="col-span-12 lg:col-span-8 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-hidden flex flex-col bg-white/5 border border-white/10 rounded-3xl p-4 lg:p-6 backdrop-blur-md relative z-20 shadow-2xl">
                    <h2 className="text-xl lg:text-2xl font-bold text-gray-400 uppercase tracking-widest mb-3 shrink-0 flex items-center justify-between">
                        <span>Tournament Leaderboard</span>
                        <span className="text-xs lg:text-sm text-gray-500 font-normal">Auto-Updates Live</span>
                    </h2>
                    <div className="flex-1 min-h-0 bg-black/80 rounded-2xl border-2 border-white/20 shadow-inner drop-shadow-xl overflow-hidden flex flex-col">
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
                    {game.view_mode} Mode
                </div>
            </div>

            {/* BACKGROUND WATERMARK */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none z-0">
                <h1 className="text-[15rem] lg:text-[20rem] font-heading font-black italic tracking-tighter text-white uppercase transform -rotate-12">
                    PITCHSIDE
                </h1>
            </div>

            {/* MAIN CONTENT AREA */}
            {game.view_mode === 'single' && renderSingleMode()}
            {game.view_mode === 'king' && renderKingMode()}
            {game.view_mode === 'tournament' && renderTournamentMode()}
        </div>
    );
}
