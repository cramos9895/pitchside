
'use client';

const TEXT_COLOR_MAP: Record<string, string> = {
    'Neon Orange': 'text-orange-500',
    'Neon Blue': 'text-cyan-400',
    'Neon Green': 'text-[#ccff00]',
    'White': 'text-white',
    'Black': 'text-gray-400',
    'Red': 'text-red-500',
    'Yellow': 'text-yellow-400',
    'Light Blue': 'text-blue-400',
    'Pink': 'text-pink-500',
    'Purple': 'text-purple-500',
    'Blue': 'text-blue-600',
    'Grey': 'text-gray-500'
};

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Save, Loader2, Trash2, Layers, CheckCircle2, Trophy, ArrowRight, PlayCircle, Edit, PauseCircle, Square, Clock, PlusCircle, MinusCircle, MonitorPlay } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { finalizeGame } from '@/app/actions/finalize-game';

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
    game: any;
    bookings: any[];
    onUpdate: () => void;
    onVerifyPayment?: (bookingId: string, currentStatus: string) => Promise<void>;
    filterMode?: 'king' | 'tournament';
}

export function MatchManager({ game, bookings, onUpdate, filterMode }: MatchManagerProps) {
    const router = useRouter();
    const supabase = createClient();

    const gameId = game.id;
    const teams: TeamConfig[] = game.teams_config || [
        { name: 'Team A', color: 'Neon Orange' },
        { name: 'Team B', color: 'White' }
    ];
    const gameStatus = game.status;
    const initialMvpId = game.mvp_player_id;

    // Derived Players for MVP Selection (using User ID)
    const players = bookings.map((b: any) => ({
        id: b.user_id,
        name: b.profiles?.full_name || b.profiles?.email || 'Unknown',
        team: b.team_assignment || 'Unassigned'
    }));

    const [matches, setMatches] = useState<Match[]>([]);
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

    // Ref to track active match ID across async closures (avoids stale state race conditions)
    const activeMatchIdRef = useRef<string | null>(null);
    const insertingRef = useRef(false);

    // Timer State
    const [timerStatus, setTimerStatus] = useState<'stopped' | 'running' | 'paused'>(game.timer_status || 'stopped');
    const [timerDuration, setTimerDuration] = useState<number>(game.timer_duration || 420);
    const [timerStartedAt, setTimerStartedAt] = useState<string | null>(game.timer_started_at || null);
    const [timeRemaining, setTimeRemaining] = useState<number>(game.timer_duration || 420);
    const [timerLoading, setTimerLoading] = useState(false);

    // Realtime Hook for Timer Sync
    useEffect(() => {
        const channel = supabase.channel(`admin_game_timer_${gameId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
                (payload) => {
                    const newGame = payload.new;
                    setTimerStatus(newGame.timer_status);
                    setTimerDuration(newGame.timer_duration);
                    setTimerStartedAt(newGame.timer_started_at);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId, supabase]);

    // Timer Heartbeat & Remote Sync Tracking
    useEffect(() => {
        console.log("Timer Effect Triggered. Status:", timerStatus);

        let interval: NodeJS.Timeout;

        if (timerStatus === 'running' && timerStartedAt) {
            interval = setInterval(() => {
                const startTime = new Date(timerStartedAt).getTime();
                const now = new Date().getTime();
                const elapsed = Math.floor((now - startTime) / 1000);
                const remaining = Math.max(0, timerDuration - elapsed);

                setTimeRemaining(remaining);

                if (remaining <= 0) {
                    clearInterval(interval);
                }
            }, 1000);
        } else {
            if (timerDuration !== undefined) {
                setTimeRemaining(timerDuration || 420);
            }
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerStatus, timerStartedAt, timerDuration]);

    // Sync timer changes
    const updateTimerDB = async (status: 'stopped' | 'running' | 'paused', newDurationOverride?: number) => {
        setTimerLoading(true);
        try {
            const payload: any = { timer_status: status };
            let currentDuration = newDurationOverride !== undefined ? newDurationOverride : timerDuration;

            if (status === 'running') {
                payload.timer_started_at = new Date().toISOString();
                payload.timer_duration = currentDuration;
            } else if (status === 'paused') {
                if (timerStatus === 'running' && timerStartedAt) {
                    const startTime = new Date(timerStartedAt).getTime();
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);
                    currentDuration = Math.max(0, timerDuration - elapsed);
                }
                payload.timer_duration = currentDuration;
                payload.timer_started_at = null;
            } else if (status === 'stopped') {
                payload.timer_duration = newDurationOverride !== undefined ? newDurationOverride : 420;
                payload.timer_started_at = null;
                currentDuration = payload.timer_duration;
            }

            await supabase.from('games').update(payload).eq('id', gameId);

            setTimerStatus(payload.timer_status);
            setTimerDuration(payload.timer_duration);
            setTimerStartedAt(payload.timer_started_at);
            setTimeRemaining(payload.timer_duration);

        } catch (e: any) {
            alert('Timer Error: ' + e.message);
        } finally {
            setTimerLoading(false);
        }
    };

    // 1. Fetch & Sort Matches on Mount
    useEffect(() => {
        const fetchMatches = async () => {
            const res = await fetch(`/api/matches?gameId=${gameId}`);
            const result = await res.json();
            const data = result.data || [];

            if (data.length > 0) {
                let filteredData = data;
                if (filterMode === 'king') {
                    filteredData = data.filter((m: any) => !m.round_number || m.round_number === 0);
                } else if (filterMode === 'tournament') {
                    filteredData = data.filter((m: any) => m.round_number && m.round_number > 0);
                }

                setMatches(filteredData);

                // Initialize active match ref from existing data
                const existingActive = filteredData.find((m: any) => m.status === 'active');
                if (existingActive) {
                    activeMatchIdRef.current = existingActive.id;
                }

                // Determine Max Round
                const max = data.reduce((acc: number, m: any) => Math.max(acc, m.round_number || 0), 0);
                setMaxRound(max);

                // Determine Current Round (First valid round with scheduled games)
                // Filter for rounds > 0
                const validMatches = data.filter((m: any) => (m.round_number || 0) > 0);

                if (validMatches.length > 0) {
                    // Find first round that has at least one scheduled/active match
                    const unfinishedRound = validMatches.find((m: any) => m.status === 'scheduled' || m.status === 'active')?.round_number;

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
    }, [gameId]);

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
                fetch('/api/matches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update',
                        matchId: u.id,
                        matchData: {
                            home_score: u.home_score,
                            away_score: u.away_score,
                            status: 'completed',
                            is_final: true
                        }
                    })
                })
            ));

            // Refresh Standings Logic (Triggered by DB change / Page refresh)
            router.refresh();
            router.refresh();
            if (onUpdate) onUpdate();

            // Advance Round
            setCurrentRound(prev => prev + 1);
            setRoundScores({}); // Clear buffer

            // Re-fetch to update local state fully
            const refetchRes = await fetch(`/api/matches?gameId=${gameId}`);
            const refetchResult = await refetchRes.json();
            if (refetchResult.data) setMatches(refetchResult.data);

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
                    fetch('/api/matches', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'update',
                            matchId: u.id,
                            matchData: {
                                home_score: u.home,
                                away_score: u.away
                            }
                        })
                    })
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
                const { data: bookings } = await supabase.from('bookings').select('*, profiles!bookings_user_id_fkey(full_name, email)').eq('game_id', gameId);
                const allPlayers = (bookings || []).map((b: any) => ({
                    id: b.id,
                    userId: b.user_id,
                    name: b.profiles?.full_name || 'Unknown',
                    email: b.profiles?.email || 'No email',
                    team: b.team_assignment as 'A' | 'B' | null,
                    status: b.status,
                    payment_status: b.payment_status
                }));
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
            if (onUpdate) onUpdate();

        } catch (e: any) {
            alert("Error updating: " + e.message);
        } finally {
            setLoading(false);
        }
    };


    const handleLiveMatchUpdate = async (field: 'home_team' | 'away_team' | 'home_score' | 'away_score', value: string | number) => {
        const updatedMatch: any = { ...newMatch, [field]: value };
        setNewMatch(updatedMatch);

        // Use ref to find active match (avoids stale closure from React state)
        const activeId = activeMatchIdRef.current;

        if (activeId) {
            // Update existing active match
            try {
                const res = await fetch('/api/matches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update', matchId: activeId, matchData: { [field]: value } })
                });
                if (res.ok) {
                    setMatches(prev => prev.map(m => m.id === activeId ? { ...m, [field]: value } : m));
                } else {
                    console.error('[MatchManager] Failed to update active match:', res.statusText);
                }
            } catch (err) {
                console.error('[MatchManager] Error updating active match:', err);
            }
        } else {
            // Prevent concurrent inserts (race condition from rapid onChange events)
            if (insertingRef.current) return;
            insertingRef.current = true;

            try {
                console.log('[MatchManager] Creating new active match...');
                const res = await fetch('/api/matches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'insert',
                        gameId,
                        matchData: {
                            home_team: updatedMatch.home_team,
                            away_team: updatedMatch.away_team,
                            home_score: updatedMatch.home_score || 0,
                            away_score: updatedMatch.away_score || 0,
                            status: 'active',
                            round_number: 0
                        }
                    })
                });
                const result = await res.json();
                if (result.data) {
                    activeMatchIdRef.current = result.data.id;
                    setMatches(prev => [...prev, result.data]);
                    console.log('[MatchManager] Active match created:', result.data.id);
                } else {
                    console.error('[MatchManager] Insert failed, no data returned:', result.error);
                }
            } catch (err) {
                console.error('[MatchManager] Error inserting active match:', err);
            } finally {
                insertingRef.current = false;
            }
        }
    };


    const handleManualAdd = async () => {
        if (!newMatch.home_team || !newMatch.away_team) return alert("Select teams");
        setLoading(true);
        try {
            const activeId = activeMatchIdRef.current;
            console.log('[MatchManager] Record Match clicked. Active ID:', activeId);

            if (activeId) {
                const res = await fetch('/api/matches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update',
                        matchId: activeId,
                        matchData: {
                            home_team: newMatch.home_team,
                            away_team: newMatch.away_team,
                            home_score: newMatch.home_score,
                            away_score: newMatch.away_score,
                            status: 'completed',
                            is_final: true
                        }
                    })
                });
                const result = await res.json();
                if (result.data) {
                    setMatches(prev => prev.map(m => m.id === activeId ? result.data : m));
                    console.log('[MatchManager] Active match completed and recorded.');
                } else {
                    console.error('[MatchManager] Record match failed:', result.error);
                    throw new Error(result.error || "Failed to record match");
                }
            } else {
                console.log('[MatchManager] No active match found, inserting new completed match.');
                const res = await fetch('/api/matches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'insert',
                        gameId,
                        matchData: {
                            home_team: newMatch.home_team,
                            away_team: newMatch.away_team,
                            home_score: newMatch.home_score,
                            away_score: newMatch.away_score,
                            status: 'completed',
                            round_number: 0,
                            is_final: true
                        }
                    })
                });
                const result = await res.json();
                if (result.data) {
                    setMatches(prev => [...prev, result.data]);
                    console.log('[MatchManager] Completed match recorded.');
                } else {
                    console.error('[MatchManager] Record match failed (insert):', result.error);
                    throw new Error(result.error || "Failed to record match");
                }
            }

            // Clear the active match ref so the next interaction creates a fresh one
            activeMatchIdRef.current = null;

            // Immediately reset scores for the next match
            setNewMatch({ ...newMatch, home_score: 0, away_score: 0 });

            router.refresh();
            if (onUpdate) onUpdate();
        } catch (e: any) {
            console.error('[MatchManager] handleManualAdd Error:', e);
            alert("Error recording match: " + (e.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this match?")) return;
        setLoading(true);
        try {
            const res = await fetch('/api/matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', matchId: id })
            });

            if (res.ok) {
                // If the deleted match was our tracked active match, clear the ref
                if (activeMatchIdRef.current === id) {
                    activeMatchIdRef.current = null;
                }
                setMatches(prev => prev.filter(m => m.id !== id));
                router.refresh();
                if (onUpdate) onUpdate();
            } else {
                alert("Failed to delete match. Please try again.");
            }
        } catch (err) {
            console.error('[MatchManager] Error deleting match:', err);
            alert("An error occurred while deleting the match.");
        } finally {
            setLoading(false);
        }
    };

    // --- Finalization Logic ---

    const calculateWinnerName = () => {
        const stats: Record<string, { pts: number, gd: number }> = {};
        matches.forEach(m => {
            if (m.status !== 'completed') return;
            if (!stats[m.home_team]) stats[m.home_team] = { pts: 0, gd: 0 };
            if (!stats[m.away_team]) stats[m.away_team] = { pts: 0, gd: 0 };

            stats[m.home_team].gd += (m.home_score - m.away_score);
            stats[m.away_team].gd += (m.away_score - m.home_score);

            if (m.home_score > m.away_score) stats[m.home_team].pts += 3;
            else if (m.away_score > m.home_score) stats[m.away_team].pts += 3;
            else { stats[m.home_team].pts += 1; stats[m.away_team].pts += 1; }
        });

        const sorted = Object.entries(stats).sort(([, a], [, b]) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            return b.gd - a.gd;
        });

        return sorted[0] ? sorted[0][0] : null;
    };

    const handleFinalizeEvent = async () => {
        const winnerName = calculateWinnerName();
        if (!winnerName) return alert("Could not determine a winner. Record some matches first.");

        // For Manual Mode, use selected MVP. For Tournament, use editMvpId or similar.
        const finalMvpId = editMvpId;

        if (!confirm(`Conclude Event?\n\nWinner: ${winnerName}\nMVP: ${players.find(p => p.id === finalMvpId)?.name || 'None Selected'}\n\nThis will lock the event and update stats.`)) return;

        setLoading(true);
        try {
            // Import dynamically to avoid server-on-client errors? Usually fine if 'use client' + 'use server' separation is clean.
            // But we need to import it at top level if not dynamic.
            // Since this file is 'use client', standard import works if action is 'use server'.
            // I will add the import at the top later via separate edit if needed, or assume it's available.
            // Wait, I need to add the import first!
            // I'll do a multi-edit or separate edits.
            // For now, let's just write the function body assuming import update follows.

            const result = await finalizeGame(gameId, winnerName, finalMvpId || null);

            if (!result.success) {
                throw new Error(result.error);
            }

            alert("Event Concluded Successfully!");
            router.refresh();
            if (onUpdate) onUpdate();
        } catch (e: any) {
            alert("Error finalizing: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper used in UI
    const calculatedWinner = calculateWinnerName();

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-sm p-6 mb-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="font-heading text-xl font-bold italic uppercase flex items-center gap-2">
                    {isTournamentMode ? <Trophy className="w-5 h-5 text-yellow-500" /> : <Plus className="w-5 h-5 text-pitch-accent" />}
                    {isTournamentMode ? "Live Tournament" : "Match Manager"}
                </h2>

                <div className="flex items-center gap-4">
                    {isTournamentMode && !isTournamentComplete && (
                        <div className="text-xs font-mono text-pitch-secondary border border-pitch-secondary/30 px-2 py-1 rounded shrink-0">
                            ROUND {currentRound} / {maxRound}
                        </div>
                    )}
                </div>
            </div>

            {/* --- TIMER CONTROLS --- */}
            <div className="bg-black border border-white/10 rounded-sm p-4 mb-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Clock className={cn("w-6 h-6", timerStatus === 'running' ? "text-pitch-accent animate-pulse" : "text-gray-500")} />
                        <div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Global Match Timer</div>
                            <div className="text-2xl font-mono font-black tabular-nums transition-colors flex items-center gap-2">
                                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                                {timerStatus === 'running' && <span className="text-[10px] text-pitch-accent uppercase tracking-widest bg-pitch-accent/10 px-2 py-0.5 rounded ml-2">Live Sync</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <div className="flex bg-white/5 border border-white/10 rounded mr-2">
                            <button
                                onClick={() => updateTimerDB(timerStatus, Math.max(0, timerDuration - 60))}
                                disabled={timerLoading || timerStatus === 'running'}
                                className="p-2 hover:bg-white/10 transition-colors disabled:opacity-50 text-gray-400"
                                title="-1 Min"
                            >
                                <MinusCircle className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => updateTimerDB(timerStatus, timerDuration + 60)}
                                disabled={timerLoading || timerStatus === 'running'}
                                className="p-2 hover:bg-white/10 transition-colors disabled:opacity-50 text-gray-400"
                                title="+1 Min"
                            >
                                <PlusCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {timerStatus === 'running' ? (
                            <button
                                onClick={() => updateTimerDB('paused')} // Logic handles remaining duration calc
                                disabled={timerLoading}
                                className="px-6 py-2 bg-yellow-600 text-white font-bold uppercase rounded flex items-center gap-2 hover:bg-yellow-500 transition-colors"
                            >
                                <PauseCircle className="w-4 h-4" /> Pause
                            </button>
                        ) : (
                            <button
                                onClick={async () => {
                                    setTimerLoading(true);
                                    const explicitStartTime = new Date().toISOString();

                                    const { data, error } = await supabase
                                        .from('games')
                                        .update({
                                            timer_status: 'running',
                                            timer_started_at: explicitStartTime,
                                            timer_duration: timerDuration
                                        })
                                        .eq('id', gameId)
                                        .select();

                                    if (error) {
                                        console.error("SUPABASE UPDATE ERROR (START TIMERS):", error);
                                        alert("Timer rejected by DB: " + error.message);
                                    } else {
                                        console.log("DB START SUCCESS. Returned Data:", data);
                                        setTimerStatus('running');
                                        setTimerStartedAt(explicitStartTime);
                                    }
                                    setTimerLoading(false);
                                }}
                                disabled={timerLoading}
                                className="px-6 py-2 bg-pitch-accent text-black font-bold uppercase rounded flex items-center gap-2 hover:bg-white transition-colors"
                            >
                                <PlayCircle className="w-4 h-4" /> Start
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (confirm("Reset Timer to 7:00?")) {
                                    updateTimerDB('stopped', 420);
                                }
                            }}
                            disabled={timerLoading}
                            className="p-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Stop & Reset"
                        >
                            <Square className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- TOURNAMENT MODE UI --- */}
            {isTournamentMode ? (
                <div>
                    {isTournamentComplete && !isEditing ? (
                        /* VIEW MODE (Completed) */
                        <div className="animate-in fade-in">

                            {/* IF GAME IS NOT COMPLETED YET, SHOW FINALIZE VIEW */}
                            {gameStatus !== 'completed' ? (
                                <div className="text-center py-10 bg-pitch-accent/5 rounded border border-pitch-accent/20">
                                    <Trophy className="w-16 h-16 text-pitch-accent mx-auto mb-4 animate-bounce" />
                                    <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Tournament Finished!</h3>
                                    <p className="text-gray-400 mb-8 max-w-md mx-auto">All rounds are complete. Confirm the results below to finalize the event and distribute stats.</p>

                                    <div className="max-w-sm mx-auto bg-black/50 p-6 rounded border border-white/10 mb-8">
                                        <div className="text-sm text-gray-400 uppercase tracking-widest mb-1">Champion</div>
                                        <div className="text-3xl text-yellow-400 font-black uppercase tracking-tighter mb-6">{calculatedWinner || 'Unknown'}</div>

                                        {false && (
                                            <div className="text-left">
                                                <label className="text-xs font-bold text-pitch-secondary uppercase mb-2 block">Select Event MVP</label>
                                                <select
                                                    value={editMvpId}
                                                    onChange={(e) => setEditMvpId(e.target.value)}
                                                    className="w-full bg-black border border-white/20 p-2 text-sm rounded text-white focus:border-pitch-accent outline-none"
                                                >
                                                    <option value="">-- No MVP Selected --</option>
                                                    {players.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.team})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleFinalizeEvent}
                                        disabled={loading}
                                        className="bg-pitch-accent text-pitch-black hover:bg-white font-bold uppercase px-8 py-3 rounded-sm shadow-lg shadow-pitch-accent/20 transition-all transform hover:scale-105"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 inline mr-2" />}
                                        Conclude & Finalize Event
                                    </button>
                                </div>
                            ) : (
                                /* ALREADY FINALIZED SUMMARY */
                                <div className="text-center py-10 bg-white/5 rounded border border-white/10 relative group">
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
                                        <div className="text-4xl text-yellow-400 font-black uppercase tracking-tighter drop-shadow-lg mb-4">
                                            {calculatedWinner}
                                        </div>
                                    </div>

                                    {/* MVP Static Display */}
                                    {false && initialMvpId && (
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
                                            {matches.map(m => {
                                                const homeColor = teams.find(t => t.name === m.home_team)?.color || 'White';
                                                const awayColor = teams.find(t => t.name === m.away_team)?.color || 'White';
                                                const homeText = TEXT_COLOR_MAP[homeColor] || 'text-white';
                                                const awayText = TEXT_COLOR_MAP[awayColor] || 'text-white';

                                                return (
                                                    <div key={m.id} className="flex justify-between items-center bg-white/5 p-3 rounded text-sm text-gray-300">
                                                        <span className={cn(m.home_score > m.away_score ? "font-bold" : "", homeText)}>{m.home_team} {m.home_score}</span>
                                                        <span className="text-gray-600 mx-2">-</span>
                                                        <span className={cn(m.away_score > m.home_score ? "font-bold" : "", awayText)}>{m.away_score} {m.away_team}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
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
                                            {false && (
                                                <>
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
                                                </>
                                            )}

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
                                            {false && (
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
                                            )}
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
                /* --- FALLBACK MANUAL MODE / KING OF THE COURT --- */
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-black/30 p-4 rounded border border-white/5 mb-6">
                        <div className="md:col-span-1">
                            <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Home Team</label>
                            <select
                                value={newMatch.home_team}
                                onChange={(e) => handleLiveMatchUpdate('home_team', e.target.value)}
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
                                onChange={(e) => handleLiveMatchUpdate('home_score', Number(e.target.value))}
                                className="w-full bg-black border border-white/20 p-2 text-center text-white"
                            />
                        </div>

                        <div className="flex items-center justify-center text-gray-500 font-bold">VS</div>

                        <div className="md:col-span-1">
                            <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Away Team</label>
                            <select
                                value={newMatch.away_team}
                                onChange={(e) => handleLiveMatchUpdate('away_team', e.target.value)}
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
                                onChange={(e) => handleLiveMatchUpdate('away_score', Number(e.target.value))}
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
                    <div className="space-y-2 mb-8">
                        {matches.filter(m => m.status === 'completed').map(match => (
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

                    {/* CONCLUDE EVENT SECTION (Manual) */}
                    {matches.some(m => m.status === 'completed') && gameStatus !== 'completed' && (
                        <div className="border-t border-white/10 pt-6 mt-8">
                            <h4 className="text-xs font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Conclude Event
                            </h4>

                            <div className="bg-white/5 p-4 rounded border border-white/5 flex flex-col md:flex-row items-end gap-4">
                                <div className="flex-1">
                                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Calculated Winner</div>
                                    <div className="text-lg font-black text-yellow-400">{calculatedWinner || 'No Data'}</div>
                                </div>

                                {false && (
                                    <div className="flex-1 w-full md:w-auto">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Select MVP</label>
                                        <select
                                            value={editMvpId}
                                            onChange={(e) => setEditMvpId(e.target.value)}
                                            className="w-full bg-black border border-white/20 p-2 text-sm rounded text-white"
                                        >
                                            <option value="">-- Select MVP --</option>
                                            {players.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.team})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <button
                                    onClick={handleFinalizeEvent}
                                    disabled={loading}
                                    className="bg-green-600 hover:bg-green-500 text-white font-bold uppercase px-6 py-2 rounded-sm whitespace-nowrap"
                                >
                                    Conclude Event
                                </button>
                            </div>
                        </div>
                    )}

                    {gameStatus === 'completed' && (
                        <div className="bg-green-500/10 text-green-500 text-center py-4 rounded border border-green-500/20 font-bold uppercase">
                            Event Concluded
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}

