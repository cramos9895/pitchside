'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
    Clock, 
    Trophy, 
    MapPin, 
    Loader2, 
    ArrowLeft, 
    Monitor, 
    Play, 
    Pause, 
    RotateCcw, 
    Plus, 
    Minus, 
    Users, 
    CheckCircle2, 
    AlertTriangle,
    Save,
    User,
    Camera,
    X,
    CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { PlayerVerificationModal } from '@/components/admin/PlayerVerificationModal';
import { checkInPlayer, toggleManualWaiver, updatePlayerPhoto } from '@/app/actions/compliance';

export default function MatchControlRoom({ params }: { params: Promise<{ match_id: string }> }) {
    const { match_id: matchId } = use(params);
    const [match, setMatch] = useState<any>(null);
    const [game, setGame] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [displayTime, setDisplayTime] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    
    const { success, error: toastError } = useToast();
    const supabase = createClient();

    const fetchData = useCallback(async () => {
        try {
            const { data: matchData, error: matchError } = await supabase
                .from('matches')
                .select('*, games(*)')
                .eq('id', matchId)
                .single();
            
            if (matchError) throw matchError;

            if (matchData) {
                // Ensure phase is valid, default to first_half
                const validPhases = ['first_half', 'halftime', 'second_half'];
                if (!matchData.match_phase || !validPhases.includes(matchData.match_phase)) {
                    matchData.match_phase = 'first_half';
                }

                setMatch(matchData);
                setGame(matchData.games);

                // Fetch bookings for rosters
                const { data: bookingData } = await supabase
                    .from('bookings')
                    .select('*, profiles!bookings_user_id_fkey(full_name, avatar_url)')
                    .eq('game_id', matchData.game_id)
                    .in('status', ['active', 'paid']);
                
                // Fetch waivers for enrichment
                let signedIds = new Set<string>();
                if (matchData.games?.facility_id && bookingData) {
                    const userIds = bookingData.map((b: any) => b.user_id);
                    const { data: waiverData } = await supabase
                        .from('waiver_signatures')
                        .select('user_id')
                        .eq('facility_id', matchData.games.facility_id)
                        .in('user_id', userIds);
                    signedIds = new Set(waiverData?.map((w: any) => w.user_id) || []);
                }

                // Fetch match check-ins for match-specific attendance
                const { data: matchPlayerData } = await supabase
                    .from('match_players')
                    .select('user_id, is_checked_in')
                    .eq('match_id', matchId);
                
                const matchCheckinMap = new Map(matchPlayerData?.map((mp: any) => [mp.user_id, mp.is_checked_in]) || []);

                const enrichedBookings = (bookingData || []).map((b: any) => ({
                    ...b,
                    has_signed: signedIds.has(b.user_id),
                    // Decoupled state: bookings.checked_in is global, but match_players is local
                    is_match_checked_in: matchCheckinMap.get(b.user_id) || false
                }));
                
                setBookings(enrichedBookings);
            }
        } catch (err: any) {
            console.error("Match Fetch Error:", err);
            toastError("Failed to load match data");
        } finally {
            setLoading(false);
        }
    }, [matchId, supabase, toastError]);

    useEffect(() => {
        fetchData();
        
        const channel = supabase.channel(`match-manage-${matchId}`)
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
    }, [matchId, fetchData, supabase]);

    // Timer Logic (Countdown based on phase)
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

    const handleUpdateMatch = async (updates: any) => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('matches')
                .update(updates)
                .eq('id', matchId);
            
            if (error) throw error;
            // success("Match updated");
        } catch (err: any) {
            toastError("Update failed: " + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleTimerAction = async (action: 'start' | 'pause' | 'reset') => {
        let updates: any = {};
        
        if (action === 'start') {
            updates = {
                timer_status: 'running',
                timer_started_at: new Date().toISOString()
            };
        } else if (action === 'pause') {
            const startTime = match.timer_started_at ? new Date(match.timer_started_at).getTime() : Date.now();
            const sessionElapsed = Math.floor((Date.now() - startTime) / 1000);
            const totalElapsed = (match.paused_elapsed_seconds || 0) + sessionElapsed;
            
            updates = {
                timer_status: 'paused',
                paused_elapsed_seconds: totalElapsed
            };
        } else if (action === 'reset') {
            if (!confirm("Reset timer to 0:00 for this phase?")) return;
            updates = {
                timer_status: 'stopped',
                timer_started_at: null,
                paused_elapsed_seconds: 0
            };
        }
        
        await handleUpdateMatch(updates);
    };

    const handleScoreChange = async (team: 'home' | 'away', delta: number) => {
        const currentScore = team === 'home' ? (match.home_score || 0) : (match.away_score || 0);
        const nextScore = Math.max(0, currentScore + delta);
        
        await handleUpdateMatch({
            [team === 'home' ? 'home_score' : 'away_score']: nextScore
        });
    };

    const handlePhaseChange = async (newPhase: string) => {
        if (!confirm(`Switch to ${newPhase.replace('_', ' ')}? This will reset the timer.`)) return;
        
        await handleUpdateMatch({
            match_phase: newPhase,
            timer_status: 'stopped',
            timer_started_at: null,
            paused_elapsed_seconds: 0
        });
    };

    const handleCompleteMatch = async () => {
        if (!confirm("Finalize match results? This will mark it as Completed.")) return;
        await handleUpdateMatch({ status: 'completed' });
        success("Match finalized!");
    };

    const handlePlayerCheckIn = async (player: any) => {
        if (!game) return;
        setIsUpdating(true);
        const nextStatus = !player.is_match_checked_in;
        
        // Optimistic Update
        setBookings(prev => prev.map(b => 
            b.user_id === player.user_id ? { ...b, is_match_checked_in: nextStatus } : b
        ));
        
        if (selectedPlayer?.user_id === player.user_id) {
            setSelectedPlayer((prev: any) => ({ ...prev, is_match_checked_in: nextStatus }));
        }

        try {
            await checkInPlayer(player.id, game.id, matchId, nextStatus, 'match');
            success(nextStatus ? "Checked in for match." : "Match check-in removed.");
            fetchData();
        } catch (err: any) {
            toastError(err.message);
            // Revert
            setBookings(prev => prev.map(b => 
                b.user_id === player.user_id ? { ...b, is_match_checked_in: !nextStatus } : b
            ));
            if (selectedPlayer?.user_id === player.user_id) {
                setSelectedPlayer((prev: any) => ({ ...prev, is_match_checked_in: !nextStatus }));
            }
        } finally {
            setIsUpdating(false);
            setIsVerificationModalOpen(false);
        }
    };

    const handlePhotoUpload = async (file: File) => {
        if (!selectedPlayer) return;
        const formData = new FormData();
        formData.append('photo', file);
        
        try {
            console.log("Triggering updatePlayerPhoto for Registration:", selectedPlayer.id);
            const res = await updatePlayerPhoto(selectedPlayer.id, game.id, formData);
            
            if (res && res.success) {
                const newPhotoUrl = res.publicUrl;
                
                // Update local bookings state
                setBookings(prev => prev.map(b => {
                    if (b.id === selectedPlayer.id) {
                        return { ...b, verification_photo_url: newPhotoUrl };
                    }
                    return b;
                }));
                
                // Update selected player to reflect change in modal immediately
                setSelectedPlayer((prev: any) => {
                    if (!prev) return prev;
                    return { ...prev, verification_photo_url: newPhotoUrl };
                });
                
                success("Verification photo updated successfully!");
                fetchData();
            } else {
                throw new Error("Upload response was unsuccessful.");
            }
        } catch (err: any) {
            console.error("Critical Upload Failure:", err);
            toastError(err.message || "An unexpected error occurred during upload.");
            throw err; // Re-throw to let the modal handle its local state (isUploading)
        }
    };

    const handleWaiverOverride = async (player: any, status: boolean) => {
        // Optimistic
        setBookings(prev => prev.map(b => b.id === player.id ? { ...b, has_physical_waiver: status } : b));
        setSelectedPlayer((prev: any) => ({ ...prev, has_physical_waiver: status }));

        try {
            await toggleManualWaiver(player.id, game.id, status);
            success(status ? "Manual waiver override enabled." : "Manual override removed.");
            fetchData();
        } catch (err: any) {
            toastError(err.message);
            // Revert
            setBookings(bookings);
            setSelectedPlayer(player);
        }
    };

    const getPlayerName = (p: any) => {
        if (!p) return 'Unknown';
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        return profile?.full_name || 'Unknown Player';
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-pitch-accent gap-4">
            <Loader2 className="w-12 h-12 animate-spin" />
            <div className="text-sm font-black uppercase tracking-[0.5em] animate-pulse">Initializing Control Room...</div>
        </div>
    );

    if (!match) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 uppercase tracking-widest">Match Not Found</div>;

    const homeRoster = bookings.filter(b => b.team_assignment === match.home_team);
    const awayRoster = bookings.filter(b => b.team_assignment === match.away_team);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Top Navigation Bar */}
            <div className="h-16 border-b border-white/10 bg-gray-900/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <Link 
                        href={`/admin/games/${match.game_id}`}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="text-[10px] font-black uppercase text-pitch-accent tracking-widest leading-none mb-1">{game?.title}</div>
                        <h1 className="text-sm font-bold uppercase tracking-tight line-clamp-1">{match.home_team} vs {match.away_team}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={`/admin/matches/${matchId}/display`}
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 bg-pitch-accent/10 border border-pitch-accent/30 text-pitch-accent rounded hover:bg-pitch-accent hover:text-black transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <Monitor className="w-4 h-4" /> Launch Projector
                    </Link>
                    {match.status !== 'completed' && (
                        <button 
                            onClick={handleCompleteMatch}
                            className="px-4 py-2 bg-green-500 text-black rounded text-[10px] font-black uppercase tracking-widest hover:bg-green-400 transition-all flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Finalize Match
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 lg:p-10">
                <div className="max-w-7xl mx-auto space-y-10">
                    
                    {/* Main Console Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* LEFT: TIMER CONSOLE */}
                        <div className="bg-gray-900 border border-white/5 rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/5" />
                            <div className="absolute top-0 left-0 w-1/3 h-1 bg-pitch-accent group-hover:w-full transition-all duration-1000" />
                            
                            <div className="flex items-center gap-2 text-gray-500 uppercase font-black text-xs tracking-[0.2em] mb-4">
                                <Clock className="w-4 h-4" /> Game Clock
                            </div>

                            <div className={cn(
                                "text-[10rem] leading-none font-black tabular-nums tracking-tighter mb-8",
                                match.timer_status === 'running' ? "text-pitch-accent" : "text-gray-700"
                            )}>
                                {formatTime(displayTime)}
                            </div>

                            <div className="flex items-center gap-6 w-full max-w-md">
                                <button 
                                    onClick={() => handleTimerAction('reset')}
                                    className="p-4 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                    title="Reset Phase Timer"
                                >
                                    <RotateCcw className="w-8 h-8" />
                                </button>

                                <button 
                                    onClick={() => handleTimerAction(match.timer_status === 'running' ? 'pause' : 'start')}
                                    className={cn(
                                        "flex-1 py-6 rounded-2xl flex items-center justify-center gap-4 text-2xl font-black uppercase tracking-widest transition-all",
                                        match.timer_status === 'running' 
                                            ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500 hover:text-black"
                                            : "bg-pitch-accent text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_50px_rgba(204,255,0,0.1)]"
                                    )}
                                >
                                    {match.timer_status === 'running' ? (
                                        <><Pause className="w-8 h-8" fill="currentColor" /> Pause</>
                                    ) : (
                                        <><Play className="w-8 h-8" fill="currentColor" /> Resume</>
                                    )}
                                </button>
                            </div>

                            {/* Phase Selector */}
                            <div className="mt-12 w-full">
                                <div className="text-[10px] font-black uppercase text-gray-600 tracking-widest mb-4 text-center">Active Match Phase</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {['first_half', 'halftime', 'second_half'].map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => handlePhaseChange(p)}
                                            className={cn(
                                                "py-3 rounded text-[9px] font-black uppercase tracking-tighter transition-all border",
                                                match.match_phase === p
                                                    ? "bg-pitch-accent border-pitch-accent text-black shadow-lg"
                                                    : "bg-black/40 border-white/10 text-gray-500 hover:border-white/30 hover:text-white"
                                            )}
                                        >
                                            {p.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: SCORE CONSOLE */}
                        <div className="bg-gray-900 border border-white/5 rounded-xl p-8 flex flex-col">
                            <div className="flex items-center justify-center gap-2 text-gray-500 uppercase font-black text-xs tracking-[0.2em] mb-10">
                                <Trophy className="w-4 h-4" /> Live Scoreboard
                            </div>

                            <div className="flex-1 flex items-center gap-12">
                                {/* Home Score */}
                                <div className="flex-1 flex flex-col items-center gap-6">
                                    <div className="text-[9px] font-black uppercase text-pitch-accent tracking-[0.3em] h-4">HOME</div>
                                    <h2 className="text-xl font-bold uppercase tracking-tight text-center leading-tight h-14 flex items-center justify-center px-4 line-clamp-2">
                                        {match.home_team}
                                    </h2>
                                    <div className="text-[12rem] leading-none font-black text-white tabular-nums tracking-tighter">
                                        {match.home_score || 0}
                                    </div>
                                    <div className="flex gap-4 w-full">
                                        <button 
                                            onClick={() => handleScoreChange('home', -1)}
                                            className="flex-1 py-4 bg-black/40 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center"
                                        >
                                            <Minus className="w-6 h-6" />
                                        </button>
                                        <button 
                                            onClick={() => handleScoreChange('home', 1)}
                                            className="flex-[2] py-4 bg-white/10 border border-white/20 rounded-xl hover:bg-pitch-accent hover:text-black transition-all flex items-center justify-center"
                                        >
                                            <Plus className="w-8 h-8" />
                                        </button>
                                    </div>
                                </div>

                                <div className="h-40 w-px bg-white/5 self-center mt-12" />

                                {/* Away Score */}
                                <div className="flex-1 flex flex-col items-center gap-6">
                                    <div className="text-[9px] font-black uppercase text-pitch-accent tracking-[0.3em] h-4">AWAY</div>
                                    <h2 className="text-xl font-bold uppercase tracking-tight text-center leading-tight h-14 flex items-center justify-center px-4 line-clamp-2">
                                        {match.away_team}
                                    </h2>
                                    <div className="text-[12rem] leading-none font-black text-white tabular-nums tracking-tighter">
                                        {match.away_score || 0}
                                    </div>
                                    <div className="flex gap-4 w-full">
                                        <button 
                                            onClick={() => handleScoreChange('away', -1)}
                                            className="flex-1 py-4 bg-black/40 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center"
                                        >
                                            <Minus className="w-6 h-6" />
                                        </button>
                                        <button 
                                            onClick={() => handleScoreChange('away', 1)}
                                            className="flex-[2] py-4 bg-white/10 border border-white/20 rounded-xl hover:bg-pitch-accent hover:text-black transition-all flex items-center justify-center"
                                        >
                                            <Plus className="w-8 h-8" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ROSTER SPLIT */}
                    <div className="space-y-6 pb-20">
                        <div className="flex items-center gap-4 text-gray-500 uppercase font-black text-xs tracking-[0.2em]">
                            <Users className="w-4 h-4" /> Team Rosters & Player Compliance
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Home Roster */}
                            <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
                                <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                                    <h3 className="font-bold uppercase tracking-tight flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-pitch-accent"></span>
                                        {match.home_team}
                                    </h3>
                                    <span className="text-[10px] font-black uppercase text-gray-500 italic">{homeRoster.length} Registered</span>
                                </div>
                                <div className="divide-y divide-white/5 max-h-[400px] overflow-auto custom-scrollbar">
                                    {homeRoster.map((player) => (
                                        <div 
                                            key={player.id} 
                                            onClick={() => {
                                                setSelectedPlayer(player);
                                                setIsVerificationModalOpen(true);
                                            }}
                                            className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.05] cursor-pointer transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[10px] font-black border border-white/10 group-hover:border-pitch-accent transition-colors">
                                                    {getPlayerName(player).split(' ').map((n: string) => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold group-hover:text-pitch-accent transition-colors">
                                                        {getPlayerName(player)}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", player.is_match_checked_in ? "bg-green-500" : "bg-yellow-500")} />
                                                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">
                                                            {player.is_match_checked_in ? 'Checked In' : 'Not Present'}
                                                        </div>
                                                        {player.checked_in && (
                                                            <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-2">
                                                                <div className="w-1 h-1 rounded-full bg-pitch-accent" />
                                                                <div className="text-[8px] text-pitch-accent uppercase font-black tracking-widest">Verified</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-black uppercase tracking-widest group-hover:bg-pitch-accent group-hover:text-black transition-all">
                                                Verify
                                            </button>
                                        </div>
                                    ))}
                                    {homeRoster.length === 0 && (
                                        <div className="px-6 py-10 text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                            No players assigned to Home Team
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Away Roster */}
                            <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
                                <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                                    <h3 className="font-bold uppercase tracking-tight flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-white/20"></span>
                                        {match.away_team}
                                    </h3>
                                    <span className="text-[10px] font-black uppercase text-gray-500 italic">{awayRoster.length} Registered</span>
                                </div>
                                <div className="divide-y divide-white/5 max-h-[400px] overflow-auto custom-scrollbar">
                                    {awayRoster.map((player) => (
                                        <div 
                                            key={player.id} 
                                            onClick={() => {
                                                setSelectedPlayer(player);
                                                setIsVerificationModalOpen(true);
                                            }}
                                            className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.05] cursor-pointer transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[10px] font-black border border-white/10 group-hover:border-pitch-accent transition-colors">
                                                    {getPlayerName(player).split(' ').map((n: string) => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold group-hover:text-pitch-accent transition-colors">
                                                        {getPlayerName(player)}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", player.is_match_checked_in ? "bg-green-500" : "bg-yellow-500")} />
                                                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">
                                                            {player.is_match_checked_in ? 'Checked In' : 'Not Present'}
                                                        </div>
                                                        {player.checked_in && (
                                                            <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-2">
                                                                <div className="w-1 h-1 rounded-full bg-pitch-accent" />
                                                                <div className="text-[8px] text-pitch-accent uppercase font-black tracking-widest">Verified</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-black uppercase tracking-widest group-hover:bg-pitch-accent group-hover:text-black transition-all">
                                                Verify
                                            </button>
                                        </div>
                                    ))}
                                    {awayRoster.length === 0 && (
                                        <div className="px-6 py-10 text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                            No players assigned to Away Team
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="h-10 border-t border-white/5 bg-black px-6 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", isUpdating ? "bg-pitch-accent animate-ping" : "bg-green-500")}></div>
                        {isUpdating ? "Syncing..." : "Connected"}
                    </div>
                    <div className="border-l border-white/10 h-3" />
                    <div className="text-gray-500">ID: {matchId.slice(0,8)}</div>
                </div>
                <div>Pitch Side Admin v2.1</div>
            </div>
            
            {/* PLAYER VERIFICATION MODAL */}
            <PlayerVerificationModal 
                isOpen={isVerificationModalOpen}
                onClose={() => setIsVerificationModalOpen(false)}
                player={selectedPlayer}
                mode="match"
                onCheckIn={handlePlayerCheckIn}
                onPhotoUpload={handlePhotoUpload}
                onWaiverOverride={handleWaiverOverride}
                isUpdating={isUpdating}
            />
        </div>
    );
}
