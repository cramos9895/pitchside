
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Save, Loader2, Trash2, Layers, CheckCircle2, Trophy, ArrowRight, PlayCircle, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Match {
    id: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    round_number: number;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    is_final?: boolean;
}

interface TeamConfig {
    name: string;
    color: string;
}

interface MatchManagerProps {
    gameId: string;
    teams: TeamConfig[];
    existingMatches: Match[];
    onMatchUpdate?: () => void;
    players?: { id: string; name: string; team: string }[];
    gameStatus?: 'scheduled' | 'active' | 'completed' | 'cancelled';
    initialMvpId?: string | null;
}

export function MatchManager({ gameId, teams, existingMatches, onMatchUpdate, players = [], gameStatus, initialMvpId }: MatchManagerProps) {
    const router = useRouter();
    const supabase = createClient();

    const [matches, setMatches] = useState<Match[]>(existingMatches);
    const [loading, setLoading] = useState(false);

    // Live Tournament State
    const [currentRound, setCurrentRound] = useState<number>(1);
    const [maxRound, setMaxRound] = useState<number>(0);
    const [roundScores, setRoundScores] = useState<Record<string, { home: number, away: number }>>({});

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editMvpId, setEditMvpId] = useState<string>(initialMvpId || '');

    // Manual/Fallback State
    const [newMatch, setNewMatch] = useState({
        home_team: teams[0]?.name || '',
        away_team: teams[1]?.name || '',
        home_score: 0,
        away_score: 0
    });

    // 1. Fetch & Sort Matches on Mount
    useEffect(() => {
        const fetchMatches = async () => {
            const { data } = await supabase
                .from('matches')
                .select('*')
                .eq('game_id', gameId)
                .order('round_number', { ascending: true })
                .order('id', { ascending: true });

            if (data) {
                setMatches(data);

                // Determine Max Round
                const max = data.reduce((acc, m) => Math.max(acc, m.round_number || 0), 0);
                setMaxRound(max);

                // Determine Current Round (First valid round with scheduled games)
                // Filter for rounds > 0
                const validMatches = data.filter(m => (m.round_number || 0) > 0);

                if (validMatches.length > 0) {
                    // Find first round that has at least one scheduled/active match
                    const unfinishedRound = validMatches.find(m => m.status === 'scheduled' || m.status === 'active')?.round_number;

                    if (unfinishedRound) {
                        setCurrentRound(unfinishedRound);
                    } else {
                        // All finished? Set to max round + 1 or just max to show "Done"
                        setCurrentRound(max + 1);
                    }
                }
            }
        };
        fetchMatches();
    }, [gameId, supabase]);

    // Grouping
    const isTournamentMode = matches.some(m => (m.round_number || 0) > 0);
    const matchesInCurrentRound = matches.filter(m => m.round_number === currentRound);

    // If gameStatus is completed, force view to completed state unless editing
    const effectiveComplete = (isTournamentMode && currentRound > maxRound && maxRound > 0) || gameStatus === 'completed';
    const isTournamentComplete = effectiveComplete;

    // --- Actions ---

    const handleScoreChange = (matchId: string, team: 'home' | 'away', val: number) => {
        setRoundScores(prev => ({
            ...prev,
            [matchId]: {
                ...prev[matchId],
                [team]: val,
                // Ensure the other score is preserved if it exists, or init to 0
                ...(team === 'home' ? { away: prev[matchId]?.away || 0 } : { home: prev[matchId]?.home || 0 })
            }
        }));
    };

    const submitRound = async () => {
        // Validation: Verify all matches in this round have scores.
        // We define "has score" as:
        // 1. It is in roundScores (user touched it)
        // 2. OR match status is already completed (previously saved)
        // 3. OR it defaults to 0-0 and we explicitly allow it.
        const pendingMatches = matchesInCurrentRound.filter(m => m.status !== 'completed');

        if (pendingMatches.length === 0) {
            setCurrentRound(prev => prev + 1);
            return;
        }

        // Fix: Allow 0-0 without touch if that is the intention.
        // If roundScores[id] is missing, we assume user accepts the default 0-0 (or whatever is in DB/state)
        // So we Map FIRST, then validate if necessary. 
        // Actually, let's just use 0 if undefined.

        const matchesToSubmit = pendingMatches.map(m => {
            const scores = roundScores[m.id] || { home: m.home_score || 0, away: m.away_score || 0 };
            return {
                id: m.id,
                home_score: scores.home,
                away_score: scores.away,
                status: 'completed',
                is_final: true
            };
        });

        // Optional: If you strictly wanted "User MUST Touch", keep logical check.
        // But user request "Allow 0-0... error checking if (!score)" implies they want 0 to work.
        // By defaulting to 0 if undefined, we implicitly allow "untouched 0-0".


        setLoading(true);
        try {
            const updates = matchesToSubmit;

            // Upsert doesn't work easily with multiple ID updates unless we use a loop or logic
            // Supabase upsert requires primary key. We can do Promise.all
            await Promise.all(updates.map(u =>
                supabase.from('matches').update({
                    home_score: u.home_score,
                    away_score: u.away_score,
                    status: 'completed',
                    is_final: true
                }).eq('id', u.id)
            ));

            // Refresh Standings Logic (Triggered by DB change / Page refresh)
            router.refresh();
            if (onMatchUpdate) onMatchUpdate();

            // Advance Round
            setCurrentRound(prev => prev + 1);
            setRoundScores({}); // Clear buffer

            // Re-fetch to update local state fully
            const { data } = await supabase.from('matches').select('*').eq('game_id', gameId).order('round_number', { ascending: true });
            if (data) setMatches(data);

        } catch (error: any) {
            alert("Error submitting round: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const reFinalize = async () => {
        if (!confirm("Confirm updates? This will recalculate the winner and update player stats.")) return;
        setLoading(true);
        try {
            // 1. Update Changed Scores
            const updates = Object.entries(roundScores).map(([id, scores]) => ({
                id,
                ...scores
            }));

            if (updates.length > 0) {
                await Promise.all(updates.map(u =>
                    supabase.from('matches').update({
                        home_score: u.home,
                        away_score: u.away
                    }).eq('id', u.id)
                ));
            }

            // 2. Reset Winners (Wipe Clean)
            await supabase.from('bookings').update({ is_winner: false }).eq('game_id', gameId);

            // 3. Recalculate Winner (Based on updated matches state + roundScores overrides)
            // We need to fetch fresh matches or merge local state
            // Let's use local merger for calculation
            const updatedMatches = matches.map(m => {
                const override = roundScores[m.id];
                if (override) return { ...m, home_score: override.home, away_score: override.away, status: 'completed' as const };
                return m;
            });

            const stats: any = {};
            updatedMatches.forEach(m => {
                if (m.status !== 'completed' && m.status !== 'active' && m.status !== 'scheduled') return; // Should effectively be all completed
                // Treat all as completed for calc
                if (!stats[m.home_team]) stats[m.home_team] = 0;
                if (!stats[m.away_team]) stats[m.away_team] = 0;
                if (m.home_score > m.away_score) stats[m.home_team] += 3;
                else if (m.away_score > m.home_score) stats[m.away_team] += 3;
                else { stats[m.home_team] += 1; stats[m.away_team] += 1; }
            });
            // Winner with most points
            const winner = Object.entries(stats).sort(([, a]: any, [, b]: any) => b - a)[0]; // Simple sort
            const winnerName = winner ? winner[0] : null;

            if (winnerName) {
                await supabase.from('bookings').update({ is_winner: true })
                    .eq('game_id', gameId)
                    .eq('team_assignment', winnerName);
            }

            // 4. Update MVP (Swap if changed)
            if (editMvpId !== initialMvpId) {
                // Decrement old
                if (initialMvpId) {
                    const { data: p } = await supabase.from('profiles').select('mvp_awards').eq('id', initialMvpId).single();
                    if (p && (p.mvp_awards || 0) > 0) {
                        await supabase.from('profiles').update({ mvp_awards: p.mvp_awards - 1 }).eq('id', initialMvpId);
                    }
                }
                // Increment new
                if (editMvpId) {
                    const { data: p } = await supabase.from('profiles').select('mvp_awards').eq('id', editMvpId).single();
                    if (p) await supabase.from('profiles').update({ mvp_awards: (p.mvp_awards || 0) + 1 }).eq('id', editMvpId);
                }
                await supabase.from('games').update({ mvp_player_id: editMvpId || null }).eq('id', gameId);
            }

            alert("Event Updated & Stats Recalculated!");
            setIsEditing(false); // Exit edit mode
            setRoundScores({});
            router.refresh();
            if (onMatchUpdate) onMatchUpdate();

        } catch (e: any) {
            alert("Error updating: " + e.message);
        } finally {
            setLoading(false);
        }
    };


    const handleManualAdd = async () => {
        if (!newMatch.home_team || !newMatch.away_team) return alert("Select teams");
        setLoading(true);
        try {
            const { data, error } = await supabase.from('matches').insert({
                game_id: gameId,
                home_team: newMatch.home_team,
                away_team: newMatch.away_team,
                home_score: newMatch.home_score,
                away_score: newMatch.away_score,
                status: 'completed',
                round_number: 0 // Manual
            }).select().single();

            if (error) throw error;
            setMatches([...matches, data]);
            setNewMatch({ ...newMatch, home_score: 0, away_score: 0 });
            router.refresh();
            if (onMatchUpdate) onMatchUpdate();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this match?")) return;
        await supabase.from('matches').delete().eq('id', id);
        setMatches(matches.filter(m => m.id !== id));
        router.refresh();
        if (onMatchUpdate) onMatchUpdate();
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-sm p-6 mb-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-bold italic uppercase flex items-center gap-2">
                    {isTournamentMode ? <Trophy className="w-5 h-5 text-yellow-500" /> : <Plus className="w-5 h-5 text-pitch-accent" />}
                    {isTournamentMode ? "Live Tournament" : "Match Manager"}
                </h2>
                {isTournamentMode && !isTournamentComplete && (
                    <div className="text-xs font-mono text-pitch-secondary border border-pitch-secondary/30 px-2 py-1 rounded">
                        ROUND {currentRound} / {maxRound}
                    </div>
                )}
            </div>

            {/* --- TOURNAMENT MODE UI --- */}
            {isTournamentMode ? (
                <div>
                    {isTournamentComplete && !isEditing ? (
                        /* VIEW MODE (Completed) */
                        <div className="text-center py-10 bg-white/5 rounded border border-white/10 animate-in fade-in relative group">

                            {/* Edit Button */}
                            <button
                                onClick={() => setIsEditing(true)}
                                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors"
                                title="Edit Results"
                            >
                                <Edit className="w-5 h-5" />
                            </button>

                            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                            <h3 className="text-3xl font-black text-white mb-2 uppercase italic">Tournament Complete!</h3>

                            {/* Winner Display */}
                            <div className="my-8">
                                <span className="text-sm text-gray-400 uppercase tracking-widest block mb-1">Champion</span>
                                {(() => {
                                    // Calc Winner Locally
                                    const stats: Record<string, { pts: number, gd: number, w: number }> = {};
                                    matches.forEach(m => {
                                        if (m.status !== 'completed') return;
                                        // Initialize
                                        if (!stats[m.home_team]) stats[m.home_team] = { pts: 0, gd: 0, w: 0 };
                                        if (!stats[m.away_team]) stats[m.away_team] = { pts: 0, gd: 0, w: 0 };

                                        const h = stats[m.home_team];
                                        const a = stats[m.away_team];

                                        h.gd += (m.home_score - m.away_score);
                                        a.gd += (m.away_score - m.home_score);

                                        if (m.home_score > m.away_score) {
                                            h.pts += 3;
                                            h.w += 1;
                                        } else if (m.away_score > m.home_score) {
                                            a.pts += 3;
                                            a.w += 1;
                                        } else {
                                            h.pts += 1;
                                            a.pts += 1;
                                        }
                                    });

                                    const sorted = Object.entries(stats).sort(([, a], [, b]) => {
                                        if (b.pts !== a.pts) return b.pts - a.pts;
                                        return b.gd - a.gd;
                                    });

                                    const winnerName = sorted[0] ? sorted[0][0] : "Determining...";
                                    const winnerStats = sorted[0] ? sorted[0][1] : { w: 0, gd: 0, pts: 0 };

                                    return (
                                        <div className="animate-in zoom-in duration-500">
                                            <div className="text-4xl text-yellow-400 font-black uppercase tracking-tighter drop-shadow-lg mb-4">
                                                {winnerName}
                                            </div>

                                            {/* Stat Card */}
                                            <div className="grid grid-cols-3 gap-2 bg-gradient-to-b from-yellow-500/20 to-black border border-yellow-500/50 rounded-lg p-3 max-w-sm mx-auto shadow-xl backdrop-blur-sm">
                                                <div className="text-center">
                                                    <div className="text-xl font-black text-white">{winnerStats.w}</div>
                                                    <div className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider">Wins</div>
                                                </div>
                                                <div className="text-center border-l border-white/10 border-r">
                                                    <div className="text-xl font-black text-white">{winnerStats.gd > 0 ? `+${winnerStats.gd}` : winnerStats.gd}</div>
                                                    <div className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider">GD</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xl font-black text-white">{winnerStats.pts}</div>
                                                    <div className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider">Pts</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* MVP Static Display */}
                            {initialMvpId && (
                                <div className="mb-8">
                                    <span className="text-xs font-bold text-pitch-secondary uppercase mb-1 block">MVP</span>
                                    <div className="text-white font-bold text-lg">
                                        {players.find(p => p.id === initialMvpId)?.name || 'Unknown Player'}
                                    </div>
                                </div>
                            )}

                            {/* Read-Only Matches List */}
                            <div className="max-w-2xl mx-auto border-t border-white/10 pt-6">
                                <h4 className="text-xs font-bold uppercase text-gray-500 mb-4">Match Results</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {matches.map(m => (
                                        <div key={m.id} className="flex justify-between items-center bg-white/5 p-3 rounded text-sm text-gray-300">
                                            <span className={m.home_score > m.away_score ? "text-white font-bold" : ""}>{m.home_team} {m.home_score}</span>
                                            <span className="text-gray-600 mx-2">-</span>
                                            <span className={m.away_score > m.home_score ? "text-white font-bold" : ""}>{m.away_score} {m.away_team}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ACTIVE OR EDIT MODE */
                        <div className="space-y-6">
                            <div className="bg-black/30 p-4 rounded border border-pitch-accent/20">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold uppercase text-white flex items-center gap-2">
                                        {isEditing ? <Edit className="w-4 h-4 text-orange-500" /> : <PlayCircle className="w-4 h-4 text-pitch-accent" />}
                                        {isEditing ? `Editing Results (Round ${maxRound})` : `Active Round: ${currentRound}`}
                                    </h3>
                                    {isEditing && (
                                        <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:text-white underline">Cancel Edit</button>
                                    )}
                                </div>

                                <div className="grid gap-4">
                                    {(isEditing ? matches : matchesInCurrentRound).map(match => {
                                        const isDone = match.status === 'completed' && !isEditing;
                                        // Use entered score OR saved score
                                        const hScore = roundScores[match.id]?.home ?? match.home_score;
                                        const aScore = roundScores[match.id]?.away ?? match.away_score;

                                        if (match.status === 'scheduled' && isEditing) return null; // Only edit completed in edit mode usually, but showing all for flexibility

                                        return (
                                            <div key={match.id} className="grid grid-cols-12 gap-2 items-center bg-white/5 p-3 rounded">
                                                {/* Home */}
                                                <div className="col-span-4 text-right">
                                                    <span className="text-sm font-bold text-white">{match.home_team}</span>
                                                </div>
                                                {/* Score Input */}
                                                <div className="col-span-4 flex items-center justify-center gap-2">
                                                    <input
                                                        type="number"
                                                        disabled={isDone}
                                                        value={hScore}
                                                        onChange={(e) => handleScoreChange(match.id, 'home', Number(e.target.value))}
                                                        className={cn("w-12 bg-black border p-2 text-center text-white rounded font-mono text-lg", isDone ? "border-transparent text-gray-400" : "border-pitch-accent")}
                                                    />
                                                    <span className="text-gray-600">-</span>
                                                    <input
                                                        type="number"
                                                        disabled={isDone}
                                                        value={aScore}
                                                        onChange={(e) => handleScoreChange(match.id, 'away', Number(e.target.value))}
                                                        className={cn("w-12 bg-black border p-2 text-center text-white rounded font-mono text-lg", isDone ? "border-transparent text-gray-400" : "border-pitch-accent")}
                                                    />
                                                </div>
                                                {/* Away */}
                                                <div className="col-span-4 text-left">
                                                    <span className="text-sm font-bold text-white">{match.away_team}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                    }
                                    {matchesInCurrentRound.length === 0 && !isEditing && (
                                        <p className="text-sm text-gray-500 italic">No matches scheduled for this round.</p>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="mt-6">
                                    {isEditing ? (
                                        <div className="border-t border-white/10 pt-4">
                                            <label className="text-xs font-bold text-pitch-secondary uppercase mb-2 block">Confirm MVP (Optional Swap)</label>
                                            <select
                                                value={editMvpId}
                                                onChange={(e) => setEditMvpId(e.target.value)}
                                                className="w-full bg-black border border-pitch-accent/50 p-2 rounded text-white mb-4"
                                            >
                                                <option value="">-- Select MVP --</option>
                                                {players.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.team})</option>
                                                ))}
                                            </select>

                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={reFinalize}
                                                    disabled={loading}
                                                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase px-6 py-3 rounded-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                                                >
                                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    Update & Re-Finalize
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        (!isTournamentComplete && (
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={submitRound}
                                                    disabled={loading || matchesInCurrentRound.length === 0}
                                                    className="bg-pitch-accent hover:bg-white text-black font-bold uppercase px-6 py-3 rounded-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                                                >
                                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                                    Submit Round & Next
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}

                                    {/* Initial Winner/Finalize Screen for Active Mode (Last Round) */}
                                    {isTournamentComplete && !isEditing && matches.some(m => !m.is_final) && (
                                        <div className="mt-8 pt-8 border-t border-white/10 text-center">
                                            <p className="text-gray-400 mb-4">All rounds complete. Ready to finalize?</p>
                                            {/* MVP Select for Initial Finalize */}
                                            <div className="max-w-xs mx-auto mb-4 text-left">
                                                <label className="text-xs font-bold text-pitch-secondary uppercase mb-2 block">Select MVP</label>
                                                <select
                                                    id="mvp-select"
                                                    className="w-full bg-black border border-pitch-accent/50 p-3 rounded text-white"
                                                >
                                                    <option value="">-- Select MVP --</option>
                                                    {players.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.team || 'No Team'})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    // ... same finalize logic as before ...
                                                    // To avoid duplication, could extract, but keeping inline for now or relying on the 'View Mode' block which handles this after state update
                                                    // Actually, if isTournamentComplete is true effectively, it renders View Mode block above.
                                                    // This block is reachable only if effectiveComplete=true but we are in the 'active' block?
                                                    // Ah, effectiveComplete forces View Mode unless isEditing. 
                                                    // So this block is unreachable unless I messed up the boolean logic.
                                                    // Let's re-read:
                                                    // isTournamentComplete = effectiveComplete.
                                                    // Top level: isTournamentMode ? ( isTournamentComplete && !isEditing ? VIEW : ACTIVE )
                                                    // So if isTournamentComplete is true, we are in VIEW block.
                                                    // So this else block (ACTIVE) is only when !isTournamentComplete.
                                                    // So this footer is unnecessary here unless we want to show it BEFORE effective completion?
                                                    // Wait, 'isTournamentComplete' logic was: currentRound > maxRound.
                                                    // If I am on the last round, currentRound == maxRound.
                                                    // Finisher logic is handled by 'Submit Round' pushing currentRound > maxRound.
                                                    // So yes, this block is likely dead code or unnecessary.
                                                }}
                                                className="hidden"
                                            >Finalize</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Future Rounds Preview (Optional, small list) */}
                            {maxRound > currentRound && (
                                <div className="opacity-50">
                                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Up Next: Round {currentRound + 1}</h4>
                                    <div className="text-xs text-gray-600">
                                        {matches.filter(m => m.round_number === currentRound + 1).length} matches waiting...
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* --- FALLBACK MANUAL MODE --- */
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-black/30 p-4 rounded border border-white/5 mb-6">
                        <div className="md:col-span-1">
                            <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Home Team</label>
                            <select
                                value={newMatch.home_team}
                                onChange={(e) => setNewMatch({ ...newMatch, home_team: e.target.value })}
                                className="w-full bg-black border border-white/20 p-2 text-sm rounded text-white"
                            >
                                {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Score</label>
                            <input
                                type="number"
                                value={newMatch.home_score}
                                onChange={(e) => setNewMatch({ ...newMatch, home_score: Number(e.target.value) })}
                                className="w-full bg-black border border-white/20 p-2 text-center text-white"
                            />
                        </div>

                        <div className="flex items-center justify-center text-gray-500 font-bold">VS</div>

                        <div className="md:col-span-1">
                            <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Away Team</label>
                            <select
                                value={newMatch.away_team}
                                onChange={(e) => setNewMatch({ ...newMatch, away_team: e.target.value })}
                                className="w-full bg-black border border-white/20 p-2 text-sm rounded text-white"
                            >
                                {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Score</label>
                            <input
                                type="number"
                                value={newMatch.away_score}
                                onChange={(e) => setNewMatch({ ...newMatch, away_score: Number(e.target.value) })}
                                className="w-full bg-black border border-white/20 p-2 text-center text-white"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleManualAdd}
                        disabled={loading}
                        className="w-full py-2 bg-pitch-accent text-black font-bold uppercase rounded-sm hover:bg-white transition-colors flex items-center justify-center gap-2 mb-8"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Record Match
                    </button>

                    {/* Simple List for Manual */}
                    <div className="space-y-2">
                        {matches.map(match => (
                            <div key={match.id} className="flex justify-between items-center bg-white/5 p-3 rounded">
                                <div className="text-sm text-white">
                                    <span className={match.home_score > match.away_score ? "text-green-400 font-bold" : ""}>{match.home_team} {match.home_score}</span>
                                    <span className="text-gray-500 mx-2">-</span>
                                    <span className={match.away_score > match.home_score ? "text-green-400 font-bold" : ""}>{match.away_score} {match.away_team}</span>
                                </div>
                                <button onClick={() => handleDelete(match.id)} className="text-gray-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
