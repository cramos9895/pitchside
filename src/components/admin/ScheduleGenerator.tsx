
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
    onScheduleSaved?: () => void;
}

export function ScheduleGenerator({ gameId, teams, onScheduleSaved }: ScheduleGeneratorProps) {
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
                const startDate = new Date(data.start_time);
                let endDate = new Date(startDate.getTime() + 60 * 60000); // Default 60m

                if (data.end_time) {
                    // Try parsing as ISO first (Expected new behavior)
                    const parsedEnd = new Date(data.end_time);
                    if (!isNaN(parsedEnd.getTime())) {
                        endDate = parsedEnd;
                    } else {
                        // Fallback for potential legacy "HH:mm:ss" if any exist (though unlikely for timestamptz column)
                        // This logic is kept just in case but likely parsedEnd handles it if it's a full string.
                        // If it's just "20:00:00", new Date("20:00:00") might be invalid or epoch.
                        // We will trust the ISO update for new games.
                    }
                }

                const diffMs = endDate.getTime() - startDate.getTime();
                const diffMins = Math.floor(diffMs / 60000);

                if (diffMins > 0) setDuration(diffMins);
            }
        };
        fetchGameTimes();
    }, [gameId, supabase]);

    const generateSchedule = () => {
        const usableTime = duration - warmup;
        const maxRounds = Math.floor(usableTime / gameLength);

        console.log(`Debug: Usable ${usableTime}m, Max Rounds ${maxRounds}`);

        // 3. The 'Circle Method' Algorithm
        // Create an array of indices [0, 1, 2...]
        let teamIndices = teams.map((_, i) => i);

        // If odd, add -1 (Bye)
        // Note: We use a local copy for calculations to not mutate config, but teamIndices is local anyway.
        if (teamIndices.length % 2 !== 0) {
            teamIndices.push(-1);
        }

        const numTeams = teamIndices.length;
        const roundsNeeded = numTeams - 1;

        // We will generate ALL possible round robin rounds first
        let allRounds: Array<Array<{ home: number, away: number }>> = [];

        for (let r = 0; r < roundsNeeded; r++) {
            let roundPairs: Array<{ home: number, away: number }> = [];

            for (let i = 0; i < numTeams / 2; i++) {
                const homeIdx = teamIndices[i];
                const awayIdx = teamIndices[numTeams - 1 - i];

                if (homeIdx !== -1 && awayIdx !== -1) {
                    roundPairs.push({ home: homeIdx, away: awayIdx });
                }
            }
            allRounds.push(roundPairs);

            // Rotate: Keep index 0, rotate 1 to end
            // [0, 1, 2, 3] -> [0, 3, 1, 2]
            const fixed = teamIndices[0];
            const rotating = teamIndices.slice(1);
            const last = rotating.pop();
            if (last !== undefined) rotating.unshift(last);
            teamIndices = [fixed, ...rotating];
        }

        // Now map these abstract rounds to our time slots and constraints
        // We have `maxRounds` time slots.
        // We have `fields` concurrent matches per slot.
        // We might need to cycle through `allRounds` multiple times if we have time, 
        // OR we might not fit all rounds if time is short.

        // BUT, the user prompt implies "Round 1" is a time slot.
        // If we have more matches in a logical round than fields, we technically need multiple time slots for one logical round.
        // FOR SIMPLICITY given the prompt: "Limit to Concurrent Fields".
        // This implies: If a logical round has 4 matches but only 2 fields, we just TAKE 2 matches and discard the rest? 
        // OR we split them? 
        // The prompt says: "Field Limit: Take the first concurrentFields pairs." -> implies discard or push to next?
        // Prompt says: "If a team matches with Bye, they sit... Take the first concurrentFields pairs"
        // We will follow the instruction: Take first N pairs. 
        // NOTE: This usually implies we just play what fits. In a real tournament you'd want to ensure everyone plays, 
        // so you might need multiple "slots" per "round". 
        // However, we will strictly follow: Loop round 0 to maxRounds-1, generating pairings using circle method state.

        // Re-Initialize for the actual generation loop which handles *Time Slots*
        let currentIndices = teams.map((_, i) => i);
        if (currentIndices.length % 2 !== 0) currentIndices.push(-1); // Add Bye

        let finalSchedule: Array<{ round: number, startTime: string, matches: Array<{ home: string, away: string }> }> = [];

        for (let r = 0; r < maxRounds; r++) {
            // 1. Generate pairings for this rotation
            let potentialPairs: Array<{ home: number, away: number }> = [];
            for (let i = 0; i < currentIndices.length / 2; i++) {
                const homeIdx = currentIndices[i];
                const awayIdx = currentIndices[currentIndices.length - 1 - i];
                // Filter Byes immediately
                if (homeIdx !== -1 && awayIdx !== -1) {
                    potentialPairs.push({ home: homeIdx, away: awayIdx });
                }
            }

            // 2. Field Limit
            const matchesForSlot = potentialPairs.slice(0, fields);

            // 3. Create Match Objects
            const matchObjects = matchesForSlot.map(pair => ({
                home: teams[pair.home].name,
                away: teams[pair.away].name
            }));

            // Calculate Time
            // Start + Warmup + (Round * GameLength)
            // We don't have exact start time object here easily without re-parsing, 
            // but we can just display "offset" or similar. 
            // The prompt says "scheduled_time calculated from startTime...".
            // Since we don't strictly store scheduled_time in DB in the schema (we use round_number), 
            // we will primarily use round_number for ordering. 
            // However, for the preview, let's show the offset time relative to event start.

            const offsetMinutes = warmup + (r * gameLength);
            // Format HH:mm for display would require the base date. 
            // Let's just store the offset string for preview
            const timeLabel = `+${offsetMinutes} mins`;

            finalSchedule.push({
                round: r + 1,
                startTime: timeLabel,
                matches: matchObjects
            });

            // 4. Rotate for next round
            const fixed = currentIndices[0];
            const rotating = currentIndices.slice(1);
            const last = rotating.pop();
            if (last !== undefined) rotating.unshift(last);
            currentIndices = [fixed, ...rotating];
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
                    status: 'scheduled'
                }))
            );

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

                    <button
                        onClick={generateSchedule}
                        className="w-full py-2 bg-white/10 text-white font-bold uppercase rounded-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Generate Schedule
                    </button>

                    <p className="text-xs text-center text-gray-500">
                        Based on times, we can fit {Math.floor((duration - warmup) / gameLength)} rounds.
                    </p>
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
                                        <div key={i} className="text-sm text-white flex justify-between items-center bg-white/5 p-2 rounded-sm mb-1">
                                            <span className="w-1/3 text-right font-bold">{m.home}</span>
                                            <span className="text-gray-600 text-[10px] uppercase px-2">VS</span>
                                            <span className="w-1/3 text-left font-bold">{m.away}</span>
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
