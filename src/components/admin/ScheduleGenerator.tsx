
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Save, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TeamConfig {
    name: string;
    color: string;
}

interface ScheduleGeneratorProps {
    gameId: string;
    teams: TeamConfig[];
    isLeague?: boolean;
    totalWeeks?: number;
    onScheduleSaved?: () => void;
}

export function ScheduleGenerator({ gameId, teams, isLeague, totalWeeks, onScheduleSaved }: ScheduleGeneratorProps) {
    const [duration, setDuration] = useState(60);
    const [warmup, setWarmup] = useState(10);
    const [gameLength, setGameLength] = useState(10);
    const [fields, setFields] = useState(1);

    // Preview State
    const [previewSchedule, setPreviewSchedule] = useState<Array<{ round: number, startTime: string, matches: Array<{ home: string, away: string }> }>>([]);
    const [generated, setGenerated] = useState(false);
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    // 1. Auto-Calculate Duration (The 'Smart' Input)
    useEffect(() => {
        const fetchGameTimes = async () => {
            const { data } = await supabase.from('games').select('start_time, end_time').eq('id', gameId).single();
            if (data && data.start_time) {
                if (isLeague) {
                     setDuration((totalWeeks || 4) * 60); // dummy value just to bypass checks
                     return;
                }
                const startDate = new Date(data.start_time);
                let endDate = new Date(startDate.getTime() + 60 * 60000); // Default 60m

                if (data.end_time) {
                    if (data.end_time.includes('T') || data.end_time.includes('-')) {
                        const parsedEnd = new Date(data.end_time);
                        if (!isNaN(parsedEnd.getTime())) {
                            endDate = parsedEnd;
                        }
                    } else {
                        // Parse "HH:mm:ss"
                        const parts = data.end_time.split(':');
                        const h = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10);

                        if (!isNaN(h) && !isNaN(m)) {
                            endDate = new Date(startDate);
                            endDate.setHours(h);
                            endDate.setMinutes(m);
                            // Handle overflow handled by Duration calc below, 
                            // but we should set the date correctly first if possible for diffMins?
                            // Actually, the calc below manages the wrap around. 
                            // But let's ensure endDate is correct relative to startDate for safety.
                            if (endDate < startDate) {
                                endDate.setDate(endDate.getDate() + 1);
                            }
                        }
                    }
                }

                // Duration (Fix: Explicit HH:MM math for Auto-Scheduler)
                const startHour = startDate.getHours();
                const startMin = startDate.getMinutes();
                const endHour = endDate.getHours();
                const endMin = endDate.getMinutes();

                let diffMins = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                if (diffMins < 0) diffMins += 24 * 60; // Handle next day



                if (diffMins > 0) setDuration(diffMins);
            }
        };
        fetchGameTimes();
    }, [gameId, supabase]);

    const generateSchedule = () => {
        let maxRounds = isLeague ? (totalWeeks! || 4) : Math.floor((duration - warmup) / gameLength);
        
        // If league, we usually want round-robin until weeks are filled.
        const numTeams = teams.length;
        if (numTeams < 2) {
             alert("Need at least 2 teams to generate a schedule.");
             return;
        }

        // Helper to generate ONE full cycle of round robin pairings
        const generateCycle = (): Array<{ home: number, away: number }> => {
            let indices = teams.map((_, i) => i);
            if (indices.length % 2 !== 0) indices.push(-1); // Bye

            const cycleQueue: Array<{ home: number, away: number }> = [];
            const rRounds = indices.length - 1;

            for (let r = 0; r < rRounds; r++) {
                for (let i = 0; i < indices.length / 2; i++) {
                    const homeIdx = indices[i];
                    const awayIdx = indices[indices.length - 1 - i];
                    if (homeIdx !== -1 && awayIdx !== -1) {
                        cycleQueue.push({ home: homeIdx, away: awayIdx });
                    }
                }

                // Rotate
                const fixed = indices[0];
                const rotating = indices.slice(1);
                const last = rotating.pop();
                if (last !== undefined) rotating.unshift(last);
                indices = [fixed, ...rotating];
            }
            return cycleQueue;
        };

        // Create Master Queue
        let masterQueue: Array<{ home: number, away: number }> = [];
        
        // Safety boundary to prevent infinite loop
        let safetyCounter = 0;
        
        if (isLeague) {
            // Fill master queue with enough cycles to cover all weeks
            const matchesPerWeek = Math.floor(teams.length / 2);
            const totalSlotsNeeded = maxRounds * matchesPerWeek;
            
            while (masterQueue.length < totalSlotsNeeded && safetyCounter < 50) {
                masterQueue = masterQueue.concat(generateCycle());
                safetyCounter++;
            }
        } else {
             const usableTime = duration - warmup;
             maxRounds = Math.floor(usableTime / gameLength);
             const totalSlotsNeeded = maxRounds * fields;
             while (masterQueue.length < totalSlotsNeeded && safetyCounter < 10) {
                masterQueue = masterQueue.concat(generateCycle());
                safetyCounter++;
             }
        }

        let finalSchedule: Array<{ round: number, startTime: string, matches: Array<{ home: string, away: string }> }> = [];

        for (let r = 0; r < maxRounds; r++) {
            let slotsFilled = 0;
            let playingThisRound = new Set<number>();
            let matchesForSlot: Array<{ home: number, away: number }> = [];
            
            const matchLimit = isLeague ? Math.floor(teams.length / 2) : fields;

            let i = 0;
            while (slotsFilled < matchLimit && i < masterQueue.length) {
                const match = masterQueue[i];
                if (!playingThisRound.has(match.home) && !playingThisRound.has(match.away)) {
                    matchesForSlot.push(match);
                    playingThisRound.add(match.home);
                    playingThisRound.add(match.away);
                    masterQueue.splice(i, 1);
                    slotsFilled++;
                } else {
                    i++;
                }
            }

            const matchObjects = matchesForSlot.map((pair, idx) => ({
                home: teams[pair.home].name,
                away: teams[pair.away].name,
                field: `Field ${idx + 1}`
            }));

            const timeLabel = isLeague ? `Week ${r + 1}` : `+${warmup + (r * gameLength)} mins`;

            finalSchedule.push({
                round: r + 1,
                startTime: timeLabel,
                matches: matchObjects
            });
        }

        setPreviewSchedule(finalSchedule);
        setGenerated(true);
    };

    const saveSchedule = async () => {
        setLoading(true);
        try {
            const matchesToInsert = previewSchedule.flatMap(r =>
                r.matches.map(m => ({
                    game_id: gameId,
                    home_team: m.home,
                    away_team: m.away,
                    home_score: 0,
                    away_score: 0,
                    round_number: r.round,
                    field_name: (m as any).field,
                    status: 'scheduled'
                }))
            );

            // Update Game Timer and Duration to match the Generate UI
            await supabase.from('games').update({
                half_length: gameLength,
                timer_duration: gameLength * 60,
                timer_status: 'stopped',
                timer_started_at: null
            }).eq('id', gameId);

            const { error } = await supabase.from('matches').insert(matchesToInsert);
            if (error) throw error;

            alert(`Schedule Created! ${matchesToInsert.length} Matches added.`);
            router.refresh();
            if (onScheduleSaved) onScheduleSaved();

        } catch (error: any) {
            alert("Error saving schedule: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-sm p-6 mb-6">
            <h2 className="font-heading text-xl font-bold italic uppercase flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-pitch-accent" /> Auto-Schedule Generator
            </h2>

            {!generated ? (
                <div className="space-y-4">
                    {!isLeague ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Duration (Min)</label>
                                <input
                                    type="number"
                                    value={duration}
                                    readOnly
                                    className="w-full bg-black/50 border border-white/10 p-2 text-gray-400 rounded cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Warmup (Min)</label>
                                <input
                                    type="number" value={warmup} onChange={(e) => setWarmup(Number(e.target.value))}
                                    className="w-full bg-black border border-white/20 p-2 text-white rounded"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Game Length (Min)</label>
                                <input
                                    type="number" value={gameLength} onChange={(e) => setGameLength(Number(e.target.value))}
                                    className="w-full bg-black border border-white/20 p-2 text-white rounded"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Concurrent Fields</label>
                                <input
                                    type="number" value={fields} onChange={(e) => setFields(Number(e.target.value))}
                                    className="w-full bg-black border border-white/20 p-2 text-white rounded"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-sm mb-4">
                            <h3 className="text-sm font-bold text-blue-400 uppercase mb-2">League Schedule Generation</h3>
                            <p className="text-xs text-blue-200">This will generate a {totalWeeks || 4}-week round-robin playing schedule for all assigned teams. Matches will be placed sequentially round-by-round.</p>
                        </div>
                    )}

                    <button
                        onClick={generateSchedule}
                        className="w-full py-2 bg-white/10 text-white font-bold uppercase rounded-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Generate Schedule
                    </button>

                    {!isLeague && (
                        <p className="text-xs text-center text-gray-500">
                            Based on times, we can fit {Math.floor((duration - warmup) / gameLength)} rounds.
                        </p>
                    )}
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold uppercase text-pitch-accent">Preview: {previewSchedule.length} Rounds</h3>
                        <button onClick={() => setGenerated(false)} className="text-xs text-gray-500 underline">Edit Settings</button>
                    </div>

                    <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                        {previewSchedule.map((round) => (
                            <div key={round.round} className="bg-black/30 p-3 rounded border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-[10px] uppercase font-bold text-gray-400">Round {round.round}</div>
                                    <div className="text-[10px] font-mono text-pitch-secondary">{round.startTime}</div>
                                </div>

                                <div className="space-y-1">
                                    {round.matches.map((m, i) => (
                                        <div key={i} className="text-[10px] text-white flex justify-between items-center bg-white/5 p-2 rounded-sm mb-1 border border-white/5">
                                            <div className="w-[60px] font-black text-pitch-secondary uppercase tracking-tighter opacity-50">{(m as any).field}</div>
                                            <div className="flex-1 flex justify-between px-4">
                                                <span className="w-1/3 text-right font-bold truncate">{m.home}</span>
                                                <span className="text-gray-600 text-[10px] uppercase px-2 shrink-0">VS</span>
                                                <span className="w-1/3 text-left font-bold truncate">{m.away}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {round.matches.length === 0 && <span className="text-xs text-gray-600 italic">No matches fit constraints.</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={saveSchedule}
                            disabled={loading}
                            className="flex-1 py-2 bg-pitch-accent text-black font-bold uppercase rounded-sm hover:bg-white transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Schedule
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
