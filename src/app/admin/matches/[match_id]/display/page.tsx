'use client';

import { use, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clock, Trophy, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FieldProjector({ params }: { params: Promise<{ match_id: string }> }) {
    const { match_id: matchId } = use(params);
    const [match, setMatch] = useState<any>(null);
    const [game, setGame] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [displayTime, setDisplayTime] = useState(0);
    const supabase = createClient();

    const fetchData = async () => {
        try {
            const { data: matchData } = await supabase
                .from('matches')
                .select('*, games(*)')
                .eq('id', matchId)
                .single();
            
            if (matchData) {
                setMatch(matchData);
                setGame(matchData.games);
            }
        } catch (err) {
            console.error("Match Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        
        const channel = supabase.channel(`match-display-${matchId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'matches', 
                filter: `id=eq.${matchId}` 
            }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId]);

    // Timer Logic
    useEffect(() => {
        if (!match || match.timer_status !== 'running') {
            if (match) {
                setDisplayTime(match.paused_elapsed_seconds || 0);
            }
            return;
        }

        const interval = setInterval(() => {
            const startTime = match.timer_started_at ? new Date(match.timer_started_at).getTime() : Date.now();
            const now = Date.now();
            const sessionElapsed = Math.floor((now - startTime) / 1000);
            setDisplayTime((match.paused_elapsed_seconds || 0) + sessionElapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [match]);

    const formatTime = (elapsedSeconds: number) => {
        const phase = match?.match_phase || 'first_half';
        let totalSeconds = 0;
        
        if (phase === 'first_half' || phase === 'second_half') {
            totalSeconds = (game?.half_length || 25) * 60;
        } else if (phase === 'halftime') {
            totalSeconds = (game?.halftime_length || 5) * 60;
        }

        // If no phase length defined (standard pickup or pre/post), count up
        if (totalSeconds === 0) {
            const mins = Math.floor(elapsedSeconds / 60);
            const secs = elapsedSeconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        const remaining = Math.max(0, totalSeconds - elapsedSeconds);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-pitch-accent gap-4">
            <Loader2 className="w-12 h-12 animate-spin" />
            <div className="text-sm font-black uppercase tracking-[0.5em] animate-pulse">Connecting to Field Feed...</div>
        </div>
    );

    if (!match) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 uppercase tracking-widest">Match Not Found</div>;

    const isTBD = match.home_team?.includes('TBD') || match.home_team?.includes('Winner') || 
                  match.away_team?.includes('TBD') || match.away_team?.includes('Winner');

    return (
        <div className="min-h-screen bg-black text-white p-12 font-sans overflow-hidden select-none cursor-none flex flex-col">
            {/* Header Area */}
            <div className="flex justify-between items-start border-b border-white/10 pb-8">
                <div>
                    <div className="flex items-center gap-3 text-pitch-accent mb-2">
                        <Trophy className="w-6 h-6" />
                        <span className="text-xl font-black uppercase tracking-widest">{game?.title || 'Tournament Match'}</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white">
                            {match.is_playoff ? 'Elimination Rounds' : 'Group Stage'}
                        </h1>
                        {match.group_name && (
                            <span className="bg-pitch-accent text-black px-4 py-1 rounded text-2xl font-black uppercase italic">
                                {match.group_name}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end gap-3 text-gray-500 mb-2">
                        <MapPin className="w-5 h-5" />
                        <span className="text-lg font-bold uppercase tracking-widest">Active Playing Field</span>
                    </div>
                    <div className="text-6xl font-black italic uppercase tracking-tight text-white">
                        {match.field_name}
                    </div>
                </div>
            </div>

            {/* Main Scoreboard Area */}
            <div className="flex-1 flex items-center justify-center gap-8 py-4">
                {/* Home Team */}
                <div className="flex-1 flex flex-col items-center gap-4">
                    <h2 className={cn(
                        "text-6xl font-black uppercase tracking-tighter text-center leading-tight h-32 flex items-center justify-center px-4",
                        isTBD ? "text-gray-600 italic" : "text-white"
                    )}>
                        {match.home_team}
                    </h2>
                    <div className="text-[22rem] leading-none font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        {match.home_score || 0}
                    </div>
                </div>

                {/* Central Timer Block */}
                <div className="flex flex-col items-center justify-center min-w-[400px]">
                    <div className={cn(
                        "text-[10rem] leading-none font-black tabular-nums tracking-tighter drop-shadow-[0_0_50px_rgba(204,255,0,0.2)]",
                        match.timer_status === 'running' ? "text-pitch-accent" : "text-gray-700"
                    )}>
                        {formatTime(displayTime)}
                    </div>
                    <div className="text-4xl font-black uppercase tracking-[0.3em] text-pitch-accent/60 mt-2 italic">
                        {match.status === 'completed' ? 'MATCH END' : (match.match_phase?.replace('_', ' ') || 'LIVE')}
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full mt-6 overflow-hidden">
                        {match.timer_status === 'running' && (
                            <div className="h-full bg-pitch-accent animate-[scan_2s_linear_infinite]" />
                        )}
                    </div>
                </div>

                {/* Away Team */}
                <div className="flex-1 flex flex-col items-center gap-4">
                    <h2 className={cn(
                        "text-6xl font-black uppercase tracking-tighter text-center leading-tight h-32 flex items-center justify-center px-4",
                        isTBD ? "text-gray-600 italic" : "text-white"
                    )}>
                        {match.away_team}
                    </h2>
                    <div className="text-[22rem] leading-none font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        {match.away_score || 0}
                    </div>
                </div>
            </div>

            {/* Footer Area */}
            <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-8">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 text-pitch-secondary uppercase font-black tracking-widest text-xs">
                        <MapPin className="w-4 h-4" /> Live Tracking
                    </div>
                    <div className="text-2xl font-black text-white uppercase italic">
                        {match.field_name} <span className="text-pitch-accent ml-2">Broadcast</span>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-lg font-bold text-gray-500 uppercase tracking-widest mb-1 italic">
                        Pitch Side Global
                    </div>
                </div>
            </div>

            <style jsx global>{`
                body {
                    background-color: black;
                    overflow: hidden;
                    margin: 0;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .delay-700 {
                    animation-delay: 700ms;
                }
            `}</style>
        </div>
    );
}
