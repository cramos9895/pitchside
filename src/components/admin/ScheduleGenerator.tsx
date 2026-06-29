
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Calendar, Save, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
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
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [fields, setFields] = useState(1);
    
    // Team Exclusions
    const [excludedTeams, setExcludedTeams] = useState<Set<string>>(new Set());

    const toggleExclusion = (teamName: string) => {
        setExcludedTeams(prev => {
            const next = new Set(prev);
            if (next.has(teamName)) next.delete(teamName);
            else next.add(teamName);
            return next;
        });
    };

    // Preview State
    const [previewSchedule, setPreviewSchedule] = useState<Array<{ round: number, startTime: string, matches: Array<{ home: string, away: string }> }>>([]);
    const [generated, setGenerated] = useState(false);
    const [loading, setLoading] = useState(false);

    const updatePreviewMatch = (roundIndex: number, matchIndex: number, field: string, value: string) => {
        setPreviewSchedule(prev => {
            const next = [...prev];
            next[roundIndex] = { ...next[roundIndex] };
            next[roundIndex].matches = [...next[roundIndex].matches];
            next[roundIndex].matches[matchIndex] = {
                ...next[roundIndex].matches[matchIndex],
                [field]: value
            };
            return next;
        });
    };

    const router = useRouter();

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
        const usableTime = duration - warmup;
        const maxRounds = isLeague ? (totalWeeks! || 4) : Math.floor(usableTime / gameLength);
        
        const activeTeams = teams.filter(t => !excludedTeams.has(t.name));
        const numTeams = activeTeams.length;
        
        if (numTeams < 2) {
             alert("Need at least 2 active teams to generate a schedule.");
             return;
        }

        interface TeamStats {
            idx: number;
            playStreak: number;
            sitStreak: number;
            totalPlayed: number;
            totalSat: number;
            playedOpponents: Set<number>;
        }

        const teamStats: TeamStats[] = activeTeams.map((_, i) => ({
            idx: i,
            playStreak: 0,
            sitStreak: 0,
            totalPlayed: 0,
            totalSat: 0,
            playedOpponents: new Set<number>()
        }));

        const finalSchedule: Array<{ round: number, startTime: string, matches: Array<{ home: string, away: string, field?: string }> }> = [];

        for (let r = 0; r < maxRounds; r++) {
            const matchLimit = isLeague ? Math.floor(numTeams / 2) : fields;
            const teamsNeeded = matchLimit * 2;
            const maxTeamsThatCanPlay = Math.min(teamsNeeded, numTeams - (numTeams % 2 !== 0 ? 1 : 0));
            
            // Determine who sits
            // Sort teams by priority to sit:
            // 1. Longest active play streak
            // 2. Fewest total sat (aka most games played)
            const sortedForSitting = [...teamStats].sort((a, b) => {
                if (b.playStreak !== a.playStreak) return b.playStreak - a.playStreak;
                if (a.totalSat !== b.totalSat) return a.totalSat - b.totalSat;
                return Math.random() - 0.5;
            });

            const numSitting = numTeams - maxTeamsThatCanPlay;
            // The rest are playing
            const playingTeamsPool = sortedForSitting.slice(numSitting).map(t => t.idx);
            
            const matchesForSlot: Array<{ home: number, away: number }> = [];
            
            // Sort playing pool by priority to play (sat longest, played least)
            playingTeamsPool.sort((a, b) => {
                const statA = teamStats[a];
                const statB = teamStats[b];
                if (statA.sitStreak !== statB.sitStreak) return statB.sitStreak - statA.sitStreak;
                return statA.totalPlayed - statB.totalPlayed;
            });

            const matched = new Set<number>();

            for (const t1 of playingTeamsPool) {
                if (matched.has(t1)) continue;
                
                let bestOpponent = -1;
                let bestOpponentScore = -999;

                for (const t2 of playingTeamsPool) {
                    if (t1 === t2 || matched.has(t2)) continue;
                    
                    let score = 0;
                    const stat1 = teamStats[t1];
                    const stat2 = teamStats[t2];

                    if (!stat1.playedOpponents.has(t2)) score += 100;
                    score += stat2.sitStreak * 10;
                    
                    if (score > bestOpponentScore) {
                        bestOpponentScore = score;
                        bestOpponent = t2;
                    }
                }

                // Fallback to any remaining unmatched team if no ideal opponent exists
                if (bestOpponent === -1) {
                    bestOpponent = playingTeamsPool.find(t => t !== t1 && !matched.has(t)) ?? -1;
                }

                if (bestOpponent !== -1) {
                    matchesForSlot.push({ home: t1, away: bestOpponent });
                    matched.add(t1);
                    matched.add(bestOpponent);
                    
                    teamStats[t1].playedOpponents.add(bestOpponent);
                    teamStats[bestOpponent].playedOpponents.add(t1);
                    
                    if (teamStats[t1].playedOpponents.size >= numTeams - 1) {
                        teamStats[t1].playedOpponents.clear();
                    }
                    if (teamStats[bestOpponent].playedOpponents.size >= numTeams - 1) {
                        teamStats[bestOpponent].playedOpponents.clear();
                    }
                }
            }

            teamStats.forEach(stat => {
                if (matched.has(stat.idx)) {
                    stat.playStreak += 1;
                    stat.sitStreak = 0;
                    stat.totalPlayed += 1;
                } else {
                    stat.sitStreak += 1;
                    stat.playStreak = 0;
                    stat.totalSat += 1;
                }
            });

            const matchObjects = matchesForSlot.map((pair, idx) => ({
                home: activeTeams[pair.home].name,
                away: activeTeams[pair.away].name,
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

            setSuccessMsg(`Schedule Created! ${matchesToInsert.length} Matches added.`);
            setShowSuccessModal(true);
            router.refresh();
            if (onScheduleSaved) onScheduleSaved();

        } catch (error: any) {
            alert("Error saving schedule: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
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

                    <div className="bg-black/30 border border-white/10 rounded p-4 mb-4">
                        <label className="text-[10px] uppercase text-gray-500 font-bold block mb-3">Participating Teams (Click to Exclude)</label>
                        <div className="flex flex-wrap gap-2">
                            {teams.map(team => {
                                const isExcluded = excludedTeams.has(team.name);
                                return (
                                    <button
                                        key={team.name}
                                        onClick={() => toggleExclusion(team.name)}
                                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all border ${
                                            isExcluded 
                                            ? 'bg-red-500/10 text-red-500 border-red-500/30 line-through opacity-50' 
                                            : 'bg-white/5 text-white border-white/10 hover:border-pitch-accent hover:text-pitch-accent'
                                        }`}
                                    >
                                        {team.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

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
                        {previewSchedule.map((round, roundIndex) => {
                            const teamsInRound = new Set(round.matches.flatMap(m => [m.home, m.away]));
                            const activeTeamsList = teams.filter(t => !excludedTeams.has(t.name));
                            const sittingOut = activeTeamsList.filter(t => !teamsInRound.has(t.name));

                            return (
                                <div key={round.round} className="bg-black/30 p-3 rounded border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-[10px] uppercase font-bold text-gray-400">Round {round.round}</div>
                                        <div className="text-[10px] font-mono text-pitch-secondary">{round.startTime}</div>
                                    </div>

                                    {sittingOut.length > 0 && (
                                        <div className="mb-3 p-2 bg-yellow-500/5 border border-yellow-500/10 rounded">
                                            <div className="text-[8px] font-black text-yellow-600 uppercase tracking-widest mb-1.5 px-1">Sitting Out This Round</div>
                                            <div className="flex flex-wrap gap-1">
                                                {sittingOut.map(t => (
                                                    <span key={t.name} className="text-[9px] font-bold text-gray-300 uppercase bg-black/30 px-2 py-0.5 rounded border border-white/5">
                                                        {t.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                    {round.matches.map((m, matchIdx) => (
                                        <div key={matchIdx} className="text-[10px] text-white flex justify-between items-center bg-white/5 p-2 rounded-sm mb-1 border border-white/5 gap-2">
                                            <div className="w-[70px] shrink-0">
                                                <select
                                                    value={(m as any).field || ''}
                                                    onChange={(e) => updatePreviewMatch(roundIndex, matchIdx, 'field', e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded px-1 py-1 font-black text-pitch-secondary uppercase tracking-tighter text-[10px] appearance-none cursor-pointer outline-none focus:border-pitch-accent"
                                                >
                                                    {Array.from({ length: fields }).map((_, i) => (
                                                        <option key={i} value={`Field ${i + 1}`}>Field {i + 1}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex-1 flex justify-between items-center px-1">
                                                <select
                                                    value={m.home}
                                                    onChange={(e) => updatePreviewMatch(roundIndex, matchIdx, 'home', e.target.value)}
                                                    className="w-[45%] bg-black/50 border border-white/10 rounded px-1 py-1 font-bold text-right text-[10px] appearance-none cursor-pointer outline-none focus:border-pitch-accent"
                                                    dir="rtl"
                                                >
                                                    {teams.filter(t => !excludedTeams.has(t.name)).map(t => (
                                                        <option key={t.name} value={t.name}>{t.name}</option>
                                                    ))}
                                                </select>
                                                <span className="text-gray-600 text-[10px] uppercase px-1 shrink-0">VS</span>
                                                <select
                                                    value={m.away}
                                                    onChange={(e) => updatePreviewMatch(roundIndex, matchIdx, 'away', e.target.value)}
                                                    className="w-[45%] bg-black/50 border border-white/10 rounded px-1 py-1 font-bold text-left text-[10px] appearance-none cursor-pointer outline-none focus:border-pitch-accent"
                                                >
                                                    {teams.filter(t => !excludedTeams.has(t.name)).map(t => (
                                                        <option key={t.name} value={t.name}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                    {round.matches.length === 0 && <span className="text-xs text-gray-600 italic">No matches fit constraints.</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
                

                <div className="bg-black/30 border border-white/5 p-4 rounded mb-6">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Schedule Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(() => {
                            const activeTeamsList = teams.filter(t => !excludedTeams.has(t.name));
                            return activeTeamsList.map(team => {
                                let played = 0;
                                let satOut = 0;
                                previewSchedule.forEach(round => {
                                    const playedInRound = round.matches.some(m => m.home === team.name || m.away === team.name);
                                    if (playedInRound) played++;
                                    else satOut++;
                                });
                                return (
                                    <div key={team.name} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5">
                                        <span className="text-[10px] font-bold text-white uppercase truncate mr-2">{team.name}</span>
                                        <div className="flex gap-2 shrink-0">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[8px] text-gray-500 uppercase font-bold leading-none">P</span>
                                                <span className="text-[10px] font-bold text-pitch-accent leading-none mt-0.5">{played}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[8px] text-gray-500 uppercase font-bold leading-none">S</span>
                                                <span className="text-[10px] font-bold text-yellow-500 leading-none mt-0.5">{satOut}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
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

        {showSuccessModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-pitch-card border border-white/10 p-6 rounded-sm max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
                    <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-heading font-bold uppercase italic text-white mb-2">Success</h3>
                    <p className="text-sm text-gray-400 mb-6">{successMsg}</p>
                    <button
                        onClick={() => { setShowSuccessModal(false); if (onScheduleSaved) onScheduleSaved(); }}
                        className="w-full bg-pitch-accent text-black font-bold uppercase py-3 rounded-sm hover:bg-white transition-colors"
                    >
                        Continue
                    </button>
                </div>
            </div>
        )}
        </>
    );
}
