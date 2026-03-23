'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp, Trophy, Clock, MapPin, Pencil, Save, ExternalLink, Play, Pause, RotateCcw, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { StandingsTable } from './StandingsTable';
import { seedTournament } from '@/app/actions/seed-tournament';
import { cleanupTournamentSeed } from '@/app/actions/cleanup-seed';
import { generateTournamentSchedule, DraftMatch, calculateStandings } from '@/utils/tournamentScheduler';
import { PlayerVerificationModal } from './PlayerVerificationModal';
import { checkInPlayer, toggleManualWaiver, updatePlayerPhoto } from '@/app/actions/compliance';
import { useEffect } from 'react';

export function MicroTournamentManager({ game, bookings, matches = [], onUpdate }: { game: any, bookings: any[], matches: any[], onUpdate: () => void }) {
    const [activeTab, setActiveTab] = useState<'roster' | 'engine' | 'leaderboard'>('roster');
    const [localScores, setLocalScores] = useState<Record<string, { home: number, away: number }>>({});
    const [isSavingMatchId, setIsSavingMatchId] = useState<string | null>(null);
    const [isGeneratingPlayoffs, setIsGeneratingPlayoffs] = useState(false);
    const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
    const [cancelling, setCancelling] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    
    // Draft Schedule State
    const [draftSchedule, setDraftSchedule] = useState<DraftMatch[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
    const [editTime, setEditTime] = useState("");
    const [editField, setEditField] = useState("");
    const [isUpdatingTimer, setIsUpdatingTimer] = useState<string | null>(null);
    const [selectedPlayerForVerification, setSelectedPlayerForVerification] = useState<any>(null);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [isCheckingInGlobal, setIsCheckingInGlobal] = useState(false);
    
    // Optimistic Bookings State
    const [localBookings, setLocalBookings] = useState(bookings);
    useEffect(() => { setLocalBookings(bookings); }, [bookings]);
    
    // Admin Override for Minimum Games (Local to scheduler)
    const [localMinGames, setLocalMinGames] = useState<number>(game.minimum_games_per_team || 3);
    
    const hasStarted = matches.some(m => m.status === 'completed' || (m.home_score || 0) > 0 || (m.away_score || 0) > 0);
    
    const { success, error: toastError } = useToast();
    const supabase = createClient();

    // Real-time Sync
    useState(() => {
        const channel = supabase
            .channel('match-updates-' + game.id)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'matches', 
                filter: `game_id=eq.${game.id}` 
            }, () => {
                onUpdate();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    });

    // 1. Calculations for Compliance Widget
    const activePlayers = localBookings.filter(b => 
        ['active', 'paid', 'confirmed', 'registered'].includes(b.status) || 
        b.roster_status === 'confirmed'
    );
    const totalPlayers = activePlayers.length;
    
    const missingWaiversCount = game.strict_waiver_required 
        ? activePlayers.filter(b => !b.has_signed && !b.has_physical_waiver).length
        : 0;
    
    const isRosterLocked = game.roster_lock_date ? new Date(game.roster_lock_date) < new Date() : false;

    // 2. Team Logic
    const teams = game.teams_config || [];
    const uniqueRegisteredTeamIds = new Set(activePlayers.map(p => p.team_id).filter(Boolean));
    const registeredTeamsCount = uniqueRegisteredTeamIds.size;

    const freeAgents = activePlayers.filter(p => !p.team_id);

    // 3. Match Segmentation & Stable Sort
    const groupMatches = matches.filter(m => !m.is_playoff).sort((a, b) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
    });
    
    const playoffMatches = matches.filter(m => m.is_playoff).sort((a, b) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
    });
    
    const allGroupMatchesCompleted = groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed');

    // Toggle Team Accordion
    const toggleTeam = (teamName: string) => {
        setExpandedTeams(prev => ({ ...prev, [teamName]: !prev[teamName] }));
    };

    // Free Agent Dropdown Assignment
    const handleAssignTeam = async (bookingId: string, teamName: string) => {
        if (!teamName) return;
        try {
            const { error } = await supabase.from('bookings').update({ team_assignment: teamName }).eq('id', bookingId);
            if (error) throw error;
            success('Player assigned securely.');
            onUpdate();
        } catch (err: any) {
            toastError("Failed to assign player: " + err.message);
        }
    };

    // Global Check-In via Modal
    const handleGlobalCheckIn = async (player: any) => {
        setIsCheckingInGlobal(true);
        // Optimistic Update
        setLocalBookings(prev => prev.map(b => b.id === player.id ? { ...b, checked_in: !player.checked_in } : b));
        
        try {
            await checkInPlayer(player.id, game.id, null, !player.checked_in);
            success(player.checked_in ? "Check-in reverted." : "Player verified and checked in.");
            setIsVerificationModalOpen(false);
            onUpdate();
        } catch (err: any) {
            toastError("Failed to check in: " + err.message);
            // Revert
            setLocalBookings(bookings);
        } finally {
            setIsCheckingInGlobal(false);
        }
    };

    const handlePhotoUpload = async (file: File) => {
        if (!selectedPlayerForVerification) return;
        const formData = new FormData();
        formData.append('photo', file);
        
        try {
            console.log("Triggering updatePlayerPhoto for Registration:", selectedPlayerForVerification.id);
            const res = await updatePlayerPhoto(selectedPlayerForVerification.id, game.id, formData);
            
            if (res && res.success) {
                const newPhotoUrl = res.publicUrl;
                
                // Update local bookings state
                setLocalBookings(prev => prev.map(b => {
                    if (b.id === selectedPlayerForVerification.id) {
                        return { ...b, verification_photo_url: newPhotoUrl };
                    }
                    return b;
                }));
                
                // Update selected player to reflect change in modal immediately
                setSelectedPlayerForVerification((prev: any) => {
                    if (!prev) return prev;
                    return { ...prev, verification_photo_url: newPhotoUrl };
                });
                
                success("Verification photo updated successfully!");
                onUpdate();
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
        setLocalBookings(prev => prev.map(b => b.id === player.id ? { ...b, has_physical_waiver: status } : b));
        setSelectedPlayerForVerification((prev: any) => ({ ...prev, has_physical_waiver: status }));

        try {
            await toggleManualWaiver(player.id, game.id, status);
            success(status ? "Manual waiver override enabled." : "Manual override removed.");
            onUpdate();
        } catch (err: any) {
            toastError(err.message);
            // Revert
            setLocalBookings(bookings);
            setSelectedPlayerForVerification(player);
        }
    };

    // Cancel Tournament
    const handleCancelTournament = async () => {
        if (!confirm('Are you absolutely sure you want to cancel this entire tournament? This will initiate the refund process.')) return;
        setCancelling(true);
        try {
            const { error } = await supabase.from('games').update({ status: 'cancelled' }).eq('id', game.id);
            if (error) throw error;
            success('Tournament cancelled successfully.');
            onUpdate();
        } catch (err: any) {
            toastError("Failed to cancel: " + err.message);
        } finally {
            setCancelling(false);
        }
    };

    const handleSeedTournament = async () => {
        if (!game?.id) {
            toastError("Game ID is missing.");
            return;
        }
        setIsSeeding(true);
        try {
            const res = await seedTournament(game.id as string);
            if (res.success) {
                success(res.message || 'Successfully seeded players');
                onUpdate();
            } else {
                toastError(res.error || "Failed to seed tournament");
            }
        } catch (err: any) {
            toastError(err.message || 'Error occurred');
        } finally {
            setIsSeeding(false);
        }
    };

    const handleCleanupTournament = async () => {
        if (!game?.id) {
            toastError("Game ID is missing.");
            return;
        }
        if (!confirm("Are you sure you want to permanently delete all @testtournament.com users from the platform?")) return;
        
        setIsCleaning(true);
        try {
            const res = await cleanupTournamentSeed(game.id as string);
            if (res.success) {
                success(res.message || 'Successfully cleaned up data');
                onUpdate();
            } else {
                toastError(res.error || "Failed to cleanup tournament");
            }
        } catch (err: any) {
            toastError(err.message || 'Error occurred');
        } finally {
            setIsCleaning(false);
        }
    };

    const handleGenerateDraft = () => {
        setIsGenerating(true);
        try {
            const registeredTeams = teams.filter((t: any) => uniqueRegisteredTeamIds.has(t.id));
            const schedule = generateTournamentSchedule({
                teams: registeredTeams,
                amountOfFields: game.amount_of_fields || 1,
                halfLength: game.half_length || 20,
                halftimeLength: game.halftime_length || 5,
                breakBetweenGames: game.break_between_games || 5,
                earliestStartTime: game.start_time,
                endTime: game.end_time || "23:59:00",
                tournamentStyle: game.tournament_style || 'group_stage',
                minGamesPerTeam: localMinGames
            });
            setDraftSchedule(schedule);
            success("Draft schedule generated successfully!");
        } catch (err: any) {
            toastError("Failed to generate schedule: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const startEditing = (match: any) => {
        setEditingMatchId(match.id);
        
        // Format ISO string to datetime-local format: YYYY-MM-DDThh:mm
        const tempDate = new Date(match.start_time);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formattedStr = `${tempDate.getFullYear()}-${pad(tempDate.getMonth()+1)}-${pad(tempDate.getDate())}T${pad(tempDate.getHours())}:${pad(tempDate.getMinutes())}`;
        
        setEditTime(formattedStr);
        setEditField(match.field_name);
    };
    
    const saveEdit = (id: string) => {
        setDraftSchedule(prev => prev.map(m => m.id === id ? { ...m, start_time: new Date(editTime).toISOString(), field_name: editField } : m));
        setEditingMatchId(null);
    };

    const handleLiveSave = async (id: string) => {
        try {
            const { error } = await supabase
                .from('matches')
                .update({ 
                    start_time: new Date(editTime).toISOString(), 
                    field_name: editField 
                })
                .eq('id', id);
            if (error) throw error;
            success("Match updated live.");
            setEditingMatchId(null);
            onUpdate();
        } catch (err: any) {
            toastError("Failed to update: " + err.message);
        }
    };

    const handleRegenerate = async () => {
        if (hasStarted) {
            toastError("Safety Lock: Cannot regenerate once scores are recorded.");
            return;
        }
        if (!confirm("Are you sure you want to PERMANENTLY delete the current schedule and start over? This cannot be undone.")) return;
        try {
            const { error } = await supabase.from('matches').delete().eq('game_id', game.id);
            if (error) throw error;
            success("Schedule cleared. You can now generate a new one.");
            onUpdate();
        } catch (err: any) {
            toastError("Failed to clear schedule: " + err.message);
        }
    };

    const handleQuickSave = async (matchId: string) => {
        const scores = localScores[matchId];
        // If no local score exists, we might just be finishing a drawing game or something, 
        // but the user wants TWO input boxes. Let's default to current score if not in localScores.
        const homeScore = scores ? scores.home : (matches.find(m => m.id === matchId)?.home_score || 0);
        const awayScore = scores ? scores.away : (matches.find(m => m.id === matchId)?.away_score || 0);
        
        setIsSavingMatchId(matchId);
        try {
            const { error } = await supabase
                .from('matches')
                .update({ 
                    home_score: homeScore, 
                    away_score: awayScore,
                    status: 'completed' 
                })
                .eq('id', matchId);
            if (error) throw error;
            success("Score saved & match completed.");
            onUpdate();
        } catch (err: any) {
            toastError("Save failed: " + err.message);
        } finally {
            setIsSavingMatchId(null);
        }
    };

    const handleUpdateTimer = async (matchId: string, action: 'start' | 'pause' | 'reset', currentElapsed: number = 0) => {
        setIsUpdatingTimer(matchId);
        try {
            const match = matches.find(m => m.id === matchId);
            if (!match) return;

            let updates: any = {};
            
            if (action === 'start') {
                updates = {
                    timer_status: 'running',
                    timer_started_at: new Date().toISOString()
                };
            } else if (action === 'pause') {
                // Calculate total elapsed so far
                const startTime = match.timer_started_at ? new Date(match.timer_started_at).getTime() : Date.now();
                const now = Date.now();
                const sessionElapsed = Math.floor((now - startTime) / 1000);
                const totalElapsed = (match.paused_elapsed_seconds || 0) + sessionElapsed;
                
                updates = {
                    timer_status: 'paused',
                    paused_elapsed_seconds: totalElapsed
                };
            } else if (action === 'reset') {
                updates = {
                    timer_status: 'stopped',
                    timer_started_at: null,
                    paused_elapsed_seconds: 0
                };
            }

            const { error } = await supabase
                .from('matches')
                .update(updates)
                .eq('id', matchId);

            if (error) throw error;
            onUpdate();
        } catch (err: any) {
            toastError("Timer update failed: " + err.message);
        } finally {
            setIsUpdatingTimer(null);
        }
    };

    const handleGeneratePlayoffs = async () => {
        if (!allGroupMatchesCompleted) return;
        setIsGeneratingPlayoffs(true);
        try {
            const currentStandings = calculateStandings(teams, groupMatches);
            const numAdvance = game.teams_into_playoffs || 4;
            const topTeams = currentStandings.slice(0, numAdvance).map(s => s.name);
            const hasBye = game.has_playoff_bye || false;

            let playoffMatchesToCreate: any[] = [];
            
            // 1. Bracket Logic per User Rules
            if (hasBye && numAdvance === 5) {
                playoffMatchesToCreate = [
                    { home: topTeams[3], away: topTeams[4], label: 'Wildcard Match' }, // 4th vs 5th
                    { home: topTeams[0], away: 'TBD (Winner Wildcard)', label: 'Semi-Final 1' }, // 1st vs Winner
                    { home: topTeams[1], away: topTeams[2], label: 'Semi-Final 2' } // 2nd vs 3rd
                ];
            } else if (hasBye && numAdvance === 9) {
                playoffMatchesToCreate = [
                    { home: topTeams[7], away: topTeams[8], label: 'Wildcard Match' }, // 8th vs 9th
                    { home: topTeams[0], away: 'TBD (Winner Wildcard)', label: 'Quarter-Final 1' }, // 1st vs Winner
                    { home: topTeams[1], away: topTeams[6], label: 'Quarter-Final 2' },
                    { home: topTeams[2], away: topTeams[5], label: 'Quarter-Final 3' },
                    { home: topTeams[3], away: topTeams[4], label: 'Quarter-Final 4' }
                ];
            } else if (numAdvance === 4) {
                playoffMatchesToCreate = [
                    { home: topTeams[0], away: topTeams[3], label: 'Semi-Final 1' },
                    { home: topTeams[1], away: topTeams[2], label: 'Semi-Final 2' }
                ];
            } else if (numAdvance === 8) {
                playoffMatchesToCreate = [
                    { home: topTeams[0], away: topTeams[7], label: 'Quarter-Final 1' },
                    { home: topTeams[1], away: topTeams[6], label: 'Quarter-Final 2' },
                    { home: topTeams[2], away: topTeams[5], label: 'Quarter-Final 3' },
                    { home: topTeams[3], away: topTeams[4], label: 'Quarter-Final 4' }
                ];
            } else {
                // Generic Fallback
                for (let i = 0; i < Math.floor(numAdvance / 2); i++) {
                    playoffMatchesToCreate.push({ 
                        home: topTeams[i], 
                        away: topTeams[numAdvance - 1 - i], 
                        label: `Elimination ${i + 1}` 
                    });
                }
            }

            // 2. Prepare Insertion (Attempt to pick a reasonable future time)
            const baseTime = new Date(groupMatches[groupMatches.length - 1]?.start_time || Date.now());
            const finalMatches = playoffMatchesToCreate.map((m, i) => ({
                game_id: game.id,
                status: 'scheduled',
                home_team: m.home,
                away_team: m.away,
                start_time: new Date(baseTime.getTime() + (i * 30 * 60000) + (15 * 60000)).toISOString(), 
                field_name: game.amount_of_fields > 1 ? `Field ${(i % game.amount_of_fields) + 1}` : 'Field 1',
                is_playoff: true,
                match_style: 'tournament'
            }));

            const { error: insertError } = await supabase.from('matches').insert(finalMatches);
            if (insertError) throw insertError;

            success(`Bracket generated! ${finalMatches.length} playoff matches seeded.`);
            onUpdate();
        } catch (err: any) {
            toastError("Playoff Error: " + err.message);
        } finally {
            setIsGeneratingPlayoffs(false);
        }
    };

    const handlePublishSchedule = async () => {
        if (draftSchedule.length === 0) return;
        setIsPublishing(true);
        try {
            const matchesToInsert = draftSchedule.map(m => ({
                game_id: game.id,
                status: 'scheduled',
                home_team: m.home_team,
                away_team: m.away_team,
                start_time: m.start_time,
                field_name: m.field_name,
                is_playoff: m.is_playoff,
                match_style: game.match_style || 'tournament'
            }));
            const { error } = await supabase.from('matches').insert(matchesToInsert);
            if (error) throw error;
            success("Schedule Locked and Published!");
            setDraftSchedule([]);
            onUpdate();
        } catch(err: any) {
            toastError(err.message);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="min-h-screen bg-pitch-black text-white p-6 pt-8 font-sans overflow-x-hidden pb-40">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* GLOBAL HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Link href="/admin" className="flex items-center text-pitch-secondary hover:text-white mb-2 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                        </Link>
                        <h1 className="font-heading text-3xl md:text-4xl font-bold italic uppercase tracking-tighter">
                            <span className="text-pitch-accent">{game.title}</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-2">
                            <span className={cn("uppercase font-bold tracking-wider px-2 py-0.5 rounded text-xs", 
                                game.status === 'scheduled' ? 'bg-yellow-500/10 text-yellow-500' : 
                                game.status === 'active' ? 'bg-blue-500/10 text-blue-500' :
                                'bg-green-500/10 text-green-500'
                            )}>
                                {game.status === 'scheduled' ? 'Registration Open' : game.status === 'active' ? 'Tournament Live' : game.status}
                            </span>
                            <span className="text-sm font-bold bg-white/10 px-3 py-1 rounded text-white flex items-center gap-2">
                                <Users className="w-4 h-4" /> {registeredTeamsCount} / {game.max_teams || '-'} Teams
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <button
                            onClick={handleCancelTournament}
                            disabled={cancelling || game.status === 'cancelled' || game.status === 'completed'}
                            className="px-6 py-2 border border-red-500/50 text-red-500 hover:bg-red-500/10 rounded uppercase font-bold text-xs tracking-wider transition-colors disabled:opacity-50"
                        >
                            {cancelling ? 'Cancelling...' : 'Cancel Tournament'}
                        </button>
                    </div>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex border-b border-white/10 mt-8">
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={cn(
                            "px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors border-b-2",
                            activeTab === 'roster' ? "border-pitch-accent text-pitch-accent" : "border-transparent text-gray-500 hover:text-white"
                        )}
                    >
                        Roster & Compliance
                    </button>
                    <button
                        onClick={() => setActiveTab('engine')}
                        className={cn(
                            "px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors border-b-2",
                            activeTab === 'engine' ? "border-pitch-accent text-pitch-accent" : "border-transparent text-gray-500 hover:text-white"
                        )}
                    >
                        Tournament Engine
                    </button>
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={cn(
                            "px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors border-b-2",
                            activeTab === 'leaderboard' ? "border-pitch-accent text-pitch-accent" : "border-transparent text-gray-500 hover:text-white"
                        )}
                    >
                        Leaderboard
                    </button>
                </div>

                {/* TAB CONTENT */}
                {activeTab === 'roster' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        
                        {/* COMPLIANCE WIDGET */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-900 border border-gray-800 p-4 rounded-sm flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Players</p>
                                    <p className="text-2xl font-black">{totalPlayers}</p>
                                </div>
                                <Users className="w-8 h-8 text-gray-600" />
                            </div>
                            <div className={cn("border p-4 rounded-sm flex items-center justify-between", (game.strict_waiver_required && missingWaiversCount > 0) ? "bg-red-500/10 border-red-500/50" : "bg-gray-900 border-gray-800")}>
                                <div>
                                    <p className={cn("text-xs font-bold uppercase tracking-wider", (game.strict_waiver_required && missingWaiversCount > 0) ? "text-red-400" : "text-gray-400")}>Missing Waivers</p>
                                    <p className={cn("text-2xl font-black", (game.strict_waiver_required && missingWaiversCount > 0) ? "text-red-500" : "text-white")}>{missingWaiversCount}</p>
                                </div>
                                {(game.strict_waiver_required && missingWaiversCount > 0) ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <CheckCircle2 className="w-8 h-8 text-green-500" />}
                            </div>
                            <div className={cn("border p-4 rounded-sm flex items-center justify-between", isRosterLocked ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30")}>
                                <div>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Roster Status</p>
                                    <p className={cn("text-xl font-bold uppercase", isRosterLocked ? "text-green-500" : "text-yellow-500")}>
                                        {isRosterLocked ? 'Locked' : 'Unlocked'}
                                    </p>
                                </div>
                                {isRosterLocked ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <AlertTriangle className="w-8 h-8 text-yellow-500" />}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                            
                            {/* TEAMS ACCORDION GRID */}
                            {(() => {
                                // Group players by team safely
                                const teamGroups = localBookings.reduce((acc: Record<string, any>, p) => {
                                    if (p.team_id) {
                                        if (!acc[p.team_id]) {
                                            acc[p.team_id] = {
                                                id: p.team_id,
                                                name: p.team_assignment || 'Unknown Team',
                                                color: p.team_color || '#ccff00',
                                                players: []
                                            };
                                        }
                                        acc[p.team_id].players.push(p);
                                    }
                                    return acc;
                                }, {});

                                const teamList = Object.values(teamGroups);

                                return (
                                    <>
                                        {/* TEAMS ACCORDION GRID */}
                                        <div className="xl:col-span-2 space-y-4">
                                            <h2 className="font-heading text-xl font-bold italic uppercase text-white mb-4">Registered Teams</h2>
                                            
                                            {teamList.length === 0 ? (
                                                <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-sm p-12 text-center">
                                                    <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                                    <h3 className="text-lg font-bold text-gray-400 mb-1 italic uppercase italic tracking-tighter">No Teams Registered Yet</h3>
                                                    <p className="text-sm text-gray-500 max-w-sm mx-auto">Registered players currently in the Draft Pool will appear here once assigned to a team.</p>
                                                </div>
                                            ) : (
                                                teamList.map((team: any) => {
                                                    const teamPlayers = team.players;
                                                    const captain = teamPlayers.find((p: any) => p.role === 'captain') || teamPlayers[0];
                                                    const captainName = captain ? (Array.isArray(captain.profiles) ? captain.profiles[0]?.full_name : captain.profiles?.full_name) : 'No Captain';
                                                    
                                                    const isExpanded = expandedTeams[team.name];

                                                    return (
                                                        <div key={team.id} className="bg-gray-900 border border-gray-800 rounded-sm overflow-hidden">
                                                            {/* Accordion Header */}
                                                            <button 
                                                                onClick={() => toggleTeam(team.name)}
                                                                className="w-full bg-black/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/5 transition-colors text-left gap-4"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                                                                    <div>
                                                                        <h3 className="font-bold uppercase tracking-wider text-lg">{team.name}</h3>
                                                                        <p className="text-xs text-pitch-secondary"><span className="uppercase font-bold tracking-wider">Capt:</span> {captainName}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-6">
                                                                    <div className="text-right">
                                                                        <span className="text-sm font-mono text-gray-300">{teamPlayers.length} / {game.min_players_per_team || '-'} minimum</span>
                                                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Players</p>
                                                                    </div>
                                                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                                                </div>
                                                            </button>

                                                            {/* Accordion Body */}
                                                            {isExpanded && (
                                                                <div className="border-t border-white/5 bg-black/20">
                                                                    <div className="overflow-x-auto">
                                                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                                                            <thead className="bg-black/50 text-[10px] uppercase tracking-wider text-gray-500">
                                                                                <tr>
                                                                                    <th className="px-4 py-2">Player</th>
                                                                                    <th className="px-4 py-2 text-center">Waiver</th>
                                                                                    <th className="px-4 py-2 text-right">Check-In</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-white/5">
                                                                                {teamPlayers.map((p: any) => {
                                                                                    const name = Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name || 'Unknown';
                                                                                    return (
                                                                                        <tr key={p.id} className="hover:bg-white/5">
                                                                                            <td className="px-4 py-3 font-medium flex items-center gap-2">
                                                                                                {name} {p.role === 'captain' && <span className="bg-pitch-accent text-black text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ml-2">Capt</span>}
                                                                                            </td>
                                                                                            <td className="px-4 py-3 text-center">
                                                                                                {p.has_signed || p.has_physical_waiver ? (
                                                                                                    <span className="inline-block bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Signed</span>
                                                                                                ) : game.strict_waiver_required ? (
                                                                                                    <span className="inline-block bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Missing</span>
                                                                                                ) : (
                                                                                                    <span className="inline-block bg-gray-500/10 text-gray-500 border border-white/5 px-2 py-0.5 rounded text-[10px] font-bold uppercase">N/A</span>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="px-4 py-3 text-right">
                                                                                                <button 
                                                                                                    onClick={() => {
                                                                                                        setSelectedPlayerForVerification(p);
                                                                                                        setIsVerificationModalOpen(true);
                                                                                                    }}
                                                                                                    className={cn(
                                                                                                        "px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all",
                                                                                                        p.checked_in 
                                                                                                            ? "bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500 hover:text-black" 
                                                                                                            : "bg-pitch-accent text-black hover:bg-white"
                                                                                                    )}
                                                                                                >
                                                                                                    {p.checked_in ? 'Verified' : 'Verify'}
                                                                                                </button>
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {/* FREE AGENT WAITING ROOM */}
                                        <div className="xl:col-span-1 border border-white/10 bg-black/40 rounded-sm p-4 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ccff00]/5 rounded-full blur-3xl" />
                                            <h2 className="font-heading text-lg font-bold italic uppercase text-pitch-accent mb-4 relative z-10 flex items-center gap-2">
                                                <Users className="w-5 h-5" /> Free Agent Waiting Room
                                            </h2>

                                            {freeAgents.length === 0 ? (
                                                <p className="text-sm text-gray-500 italic relative z-10">All players are securely assigned to teams.</p>
                                            ) : (
                                                <div className="space-y-3 relative z-10">
                                                    {freeAgents.map(p => {
                                                        const name = Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name || 'Unknown';
                                                        return (
                                                            <div key={p.id} className="bg-gray-900 p-3 rounded border border-gray-800 hover:border-white/20 transition-colors">
                                                                <p className="font-bold text-sm mb-2">{name}</p>
                                                                <select 
                                                                    onChange={(e) => handleAssignTeam(p.id, e.target.value)}
                                                                    defaultValue=""
                                                                    className="w-full bg-black border border-white/20 rounded p-1.5 text-xs text-white focus:outline-none focus:border-pitch-accent cursor-pointer"
                                                                >
                                                                    <option value="" disabled>Assign to Team [ ▼ ]</option>
                                                                    {teamList.map((t: any) => (
                                                                        <option key={t.id} value={t.name}>{t.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* TAB 2: TOURNAMENT ENGINE DRAFT UI */}
                {activeTab === 'engine' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h2 className="font-heading text-2xl font-bold italic uppercase text-white">
                                        Match Engine
                                    </h2>
                                    <p className="text-sm text-pitch-secondary">
                                        {matches.length > 0 
                                            ? `${groupMatches.length} Group Games | ${playoffMatches.length} Playoff Games`
                                            : 'Generate and adjust matches locally before publishing.'}
                                    </p>
                                </div>
                                {matches.length > 0 && (
                                    <a 
                                        href={`/admin/games/${game.id}/display`} 
                                        target="_blank" 
                                        className="flex items-center gap-2 px-4 py-2 bg-pitch-accent/10 border border-pitch-accent/30 text-pitch-accent rounded text-[10px] font-black uppercase tracking-widest hover:bg-pitch-accent hover:text-black transition-all"
                                    >
                                        <ExternalLink className="w-3 h-3" /> Launch Projector Display
                                    </a>
                                )}
                            </div>
                            <div className="flex gap-3">
                                {matches.length > 0 && !hasStarted && (
                                    <button
                                        onClick={handleRegenerate}
                                        className="px-6 py-3 border border-red-500/50 text-red-500 hover:bg-red-500/10 font-bold uppercase tracking-wider rounded transition-colors text-sm"
                                    >
                                        Regenerate Schedule
                                    </button>
                                )}
                                {hasStarted && (
                                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 rounded">
                                        <AlertTriangle className="w-3 h-3" /> Schedule Locked (Live)
                                    </div>
                                )}
                                {matches.length === 0 && (
                                    <button
                                        onClick={handleGenerateDraft}
                                        disabled={isGenerating || draftSchedule.length > 0}
                                        className="px-6 py-3 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded transition-colors hover:bg-white disabled:opacity-50 shrink-0 whitespace-nowrap"
                                    >
                                        {isGenerating ? 'Drafting...' : 'Generate Draft Schedule'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* DYNAMIC VALIDATION WIDGET (Only for Draft Mode) */}
                        {matches.length === 0 && draftSchedule.length === 0 && (
                            <div className="bg-white/5 border border-white/10 p-4 rounded-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1">Registered Teams</label>
                                    <p className="text-xl font-bold text-white">{registeredTeamsCount}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1">Max Possible Games</label>
                                    <p className="text-xl font-bold text-pitch-accent">{Math.max(0, Math.ceil(registeredTeamsCount / 2) - 1)}</p>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-[10px] uppercase font-black text-pitch-accent tracking-widest mb-2">Override Minimum Games (Group Stage)</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="number"
                                            value={localMinGames}
                                            onChange={(e) => setLocalMinGames(Number(e.target.value))}
                                            className="w-20 bg-black border border-pitch-accent/30 rounded p-2 text-white font-bold text-center focus:border-pitch-accent transition-colors"
                                        />
                                        <div className="flex-1">
                                            {localMinGames > (Math.ceil(registeredTeamsCount / 2) - 1) ? (
                                                <div className="flex items-start gap-2 text-red-500 animate-in fade-in slide-in-from-left-2">
                                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <p className="text-[10px] leading-tight uppercase font-bold">Impossible: Not enough opponents. Please reduce to {Math.max(0, Math.ceil(registeredTeamsCount / 2) - 1)} or less.</p>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-gray-500 italic">Adjusting this only affects the current draft session.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* MATCH ENGINE LISTS */}
                        {matches.length === 0 && draftSchedule.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-sm bg-black/20">
                                <Trophy className="w-12 h-12 text-gray-600 mb-4" />
                                <h2 className="text-xl font-bold uppercase italic text-gray-400 mb-2">No Draft Generated</h2>
                                <p className="text-gray-500 text-sm max-w-md text-center">
                                    Click "Generate Draft Schedule" to build the round-robin matrix based on your configured tournament variables.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {/* SECTION 1: GROUP STAGE */}
                                {(groupMatches.length > 0 || (draftSchedule.length > 0 && !draftSchedule[0].is_playoff)) && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                            <h3 className="font-heading text-xl font-bold italic uppercase text-pitch-secondary flex items-center gap-2">
                                                <Users className="w-5 h-5" /> Group Stage
                                            </h3>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                                                {groupMatches.filter(m => m.status === 'completed').length} / {groupMatches.length} Matches Finished
                                            </div>
                                        </div>
                                        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                                            <div className="flex flex-col gap-3 min-w-[1000px]">
                                                {(draftSchedule.length > 0 ? draftSchedule : groupMatches).map((match, index) => {
                                                    const isDraft = draftSchedule.length > 0;
                                                    const isEditing = editingMatchId === match.id;
                                                    const isTBD = match.home_team?.includes('TBD') || match.home_team?.includes('Winner') || 
                                                                 match.away_team?.includes('TBD') || match.away_team?.includes('Winner');
                                                    const hideScores = match.is_playoff && isTBD;

                                                    return (
                                                        <div key={match.id} className={cn(
                                                            "bg-gray-900 border border-gray-800 p-4 rounded-sm grid grid-cols-[100px_minmax(150px,1fr)_100px_150px] items-center gap-4 transition-all hover:border-white/10",
                                                            isEditing && "border-pitch-accent/50 bg-pitch-accent/5 shadow-[0_0_20px_rgba(204,255,0,0.05)]"
                                                        )}>
                                                            {/* Time & Field */}
                                                            <div className="flex items-center gap-4 min-w-[160px]">
                                                                <div className="bg-black/40 p-2 rounded border border-white/5 text-center min-w-[80px]">
                                                                    <div className="text-[10px] font-black uppercase text-pitch-accent">Start</div>
                                                                    <div className="text-sm font-bold">{new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                                </div>
                                                                <div className="text-left border-l border-white/10 pl-4">
                                                                    <div className="text-[10px] font-black uppercase text-gray-500">Field</div>
                                                                    <div className="text-sm font-bold text-gray-300">{match.field_name}</div>
                                                                    {match.group_name && (
                                                                        <div className="text-[9px] font-bold text-pitch-accent uppercase">{match.group_name}</div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Score Line */}
                                                            <div className="flex items-center justify-between px-8">
                                                                <div className="flex-1 text-right min-w-0">
                                                                    <h3 className="text-sm md:text-base font-black uppercase tracking-tight truncate text-white" title={match.home_team}>
                                                                        {match.home_team}
                                                                    </h3>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-4 px-6">
                                                                    <span className="text-3xl font-black text-pitch-accent tabular-nums">{match.home_score ?? 0}</span>
                                                                    <span className="text-gray-700 font-black text-xl">-</span>
                                                                    <span className="text-3xl font-black text-pitch-accent tabular-nums">{match.away_score ?? 0}</span>
                                                                </div>

                                                                <div className="flex-1 text-left min-w-0">
                                                                    <h3 className="text-sm md:text-base font-black uppercase tracking-tight truncate text-white" title={match.away_team}>
                                                                        {match.away_team}
                                                                    </h3>
                                                                </div>
                                                            </div>

                                                            {/* Mini Timer */}
                                                            <div className="flex flex-col items-center justify-center border-l border-white/5">
                                                                <div className={cn(
                                                                    "text-lg font-black tabular-nums tracking-widest",
                                                                    match.timer_status === 'running' ? "text-pitch-accent animate-pulse" : "text-gray-600"
                                                                )}>
                                                                    {match.timer_status === 'completed' ? 'DONE' : (match.match_phase === 'post_game' ? 'END' : 'LIVE')}
                                                                </div>
                                                                <div className="text-[10px] font-black uppercase tracking-tighter text-gray-500">
                                                                    {match.match_phase?.replace('_', ' ') || 'scheduled'}
                                                                </div>
                                                            </div>

                                                            {/* New Manage Button */}
                                                            <div className="flex items-center justify-end gap-2">
                                                                {!isDraft && (
                                                                    <Link 
                                                                        href={`/admin/matches/${match.id}/manage`}
                                                                        className="flex-1 bg-white/5 border border-white/10 hover:bg-pitch-accent hover:text-black hover:border-pitch-accent py-2 px-4 rounded text-center text-[10px] font-black uppercase tracking-widest transition-all"
                                                                    >
                                                                        Manage Match
                                                                    </Link>
                                                                )}
                                                                <button 
                                                                    onClick={() => startEditing(match)}
                                                                    className="p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Finalize Group Stage & Generate Playoffs */}
                                        {groupMatches.length > 0 && playoffMatches.length === 0 && (
                                            <div className="mt-8 p-6 bg-pitch-accent/5 border border-pitch-accent/10 rounded-sm text-center">
                                                <Trophy className="w-12 h-12 text-pitch-accent mx-auto mb-4 opacity-50" />
                                                <h3 className="text-xl font-black italic uppercase text-white mb-2">Group Stage Conclusion</h3>
                                                <p className="text-gray-400 text-xs max-w-md mx-auto mb-6 uppercase tracking-wider">
                                                    Once all {groupMatches.length} group matches are completed, you can automatically generate the seeded playoff bracket based on real-time standings.
                                                </p>
                                                <button 
                                                    onClick={handleGeneratePlayoffs}
                                                    disabled={!allGroupMatchesCompleted || isGeneratingPlayoffs}
                                                    className={cn(
                                                        "px-8 py-4 font-black text-lg uppercase tracking-wider rounded transition-all relative overflow-hidden",
                                                        allGroupMatchesCompleted 
                                                            ? "bg-pitch-accent text-black shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:scale-105 active:scale-95" 
                                                            : "bg-gray-800 text-gray-500 cursor-not-allowed grayscale"
                                                    )}
                                                >
                                                    {isGeneratingPlayoffs ? "Generating Bracket..." : (
                                                        <div className="flex items-center gap-3">
                                                            <Trophy className="w-5 h-5" /> Finalize Group Stage & Generate Playoffs
                                                        </div>
                                                    )}
                                                    {!allGroupMatchesCompleted && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Waiting for Results...</span>
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* SECTION 2: PLAYOFF BRACKET */}
                                {playoffMatches.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-pitch-accent/20 pb-2">
                                            <h3 className="font-heading text-xl font-bold italic uppercase text-pitch-accent flex items-center gap-2">
                                                <Trophy className="w-5 h-5" /> Playoff Bracket
                                            </h3>
                                        </div>
                                        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                                            <div className="flex flex-col gap-3 min-w-[1000px]">
                                                {playoffMatches.map((match, index) => {
                                                    const isEditing = editingMatchId === match.id;
                                                    const isTBD = match.home_team?.includes('TBD') || match.home_team?.includes('Winner') || 
                                                                 match.away_team?.includes('TBD') || match.away_team?.includes('Winner');
                                                    const hideScores = match.is_playoff && isTBD;

                                                    return (
                                                        <div key={match.id} className={cn(
                                                            "bg-gray-900 border border-pitch-accent/10 p-4 rounded-sm grid grid-cols-[100px_minmax(150px,1fr)_100px_150px] items-center gap-4 transition-all hover:border-pitch-accent/30 relative",
                                                            isEditing && "border-pitch-accent/50 bg-pitch-accent/5 shadow-[0_0_20px_rgba(204,255,0,0.05)]"
                                                        )}>
                                                            {/* Playoff Label */}
                                                            <div className="absolute top-0 right-0 py-0.5 px-2 bg-pitch-accent/10 text-[8px] font-black uppercase text-pitch-accent tracking-[0.2em] rounded-bl">
                                                                Elimination Match
                                                            </div>

                                                            {/* Time & Field */}
                                                            <div className="flex items-center gap-4 min-w-[160px]">
                                                                <div className="bg-black/60 p-2 rounded border border-pitch-accent/20 text-center min-w-[80px]">
                                                                    <div className="text-[10px] font-black uppercase text-pitch-accent">K/O</div>
                                                                    <div className="text-sm font-bold">{new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                                </div>
                                                                <div className="text-left border-l border-white/10 pl-4">
                                                                    <div className="text-[10px] font-black uppercase text-gray-500">Field</div>
                                                                    <div className="text-sm font-bold text-gray-300">{match.field_name}</div>
                                                                    {match.group_name && (
                                                                        <div className="text-[9px] font-bold text-pitch-accent uppercase">{match.group_name}</div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Score Line */}
                                                            <div className="flex items-center justify-between px-8">
                                                                <div className="flex-1 text-right min-w-0">
                                                                    <h3 className="text-sm md:text-base font-black uppercase tracking-tight truncate text-white" title={match.home_team}>
                                                                        {match.home_team}
                                                                    </h3>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-4 px-6">
                                                                    {!isTBD ? (
                                                                        <>
                                                                            <span className="text-3xl font-black text-pitch-accent tabular-nums">{match.home_score ?? 0}</span>
                                                                            <span className="text-pitch-accent/30 font-black text-xl">-</span>
                                                                            <span className="text-3xl font-black text-pitch-accent tabular-nums">{match.away_score ?? 0}</span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-gray-600 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap">TBD vs TBD</span>
                                                                    )}
                                                                </div>

                                                                <div className="flex-1 text-left min-w-0">
                                                                    <h3 className="text-sm md:text-base font-black uppercase tracking-tight truncate text-white" title={match.away_team}>
                                                                        {match.away_team}
                                                                    </h3>
                                                                </div>
                                                            </div>

                                                            {/* Mini Timer */}
                                                            <div className="flex flex-col items-center justify-center border-l border-white/5">
                                                                <div className={cn(
                                                                    "text-lg font-black tabular-nums tracking-widest",
                                                                    match.timer_status === 'running' ? "text-pitch-accent animate-pulse" : "text-gray-600"
                                                                )}>
                                                                    {match.status === 'completed' ? 'DONE' : (match.match_phase === 'post_game' ? 'END' : 'LIVE')}
                                                                </div>
                                                                <div className="text-[10px] font-black uppercase tracking-tighter text-gray-500">
                                                                    {match.match_phase?.replace('_', ' ') || 'scheduled'}
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Link 
                                                                    href={`/admin/matches/${match.id}/manage`}
                                                                    className="flex-1 bg-white/5 border border-white/10 hover:bg-pitch-accent hover:text-black hover:border-pitch-accent py-2 px-4 rounded text-center text-[10px] font-black uppercase tracking-widest transition-all"
                                                                >
                                                                    Manage
                                                                </Link>
                                                                <button 
                                                                    onClick={() => startEditing(match)}
                                                                    className="p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PUBLISH WIDGET (ONLY FOR DRAFT) */}
                                {draftSchedule.length > 0 && (
                                    <div className="border border-green-500/30 bg-green-500/5 rounded-sm p-6 text-center mt-8 relative overflow-hidden">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
                                        <h3 className="font-heading text-xl italic uppercase text-green-400 font-bold mb-2">Ready to Publish</h3>
                                        <p className="text-gray-400 text-sm max-w-lg mx-auto mb-6">
                                            Once you lock in this schedule, these {draftSchedule.length} matches will be written instantly to the database and become visible to all active players.
                                        </p>
                                        <button 
                                            onClick={handlePublishSchedule}
                                            disabled={isPublishing}
                                            className="px-8 py-4 bg-green-500 text-black font-black text-lg uppercase tracking-wider rounded shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:bg-green-400 transition-colors disabled:opacity-50 relative z-10"
                                        >
                                            {isPublishing ? 'Publishing...' : 'Lock in Schedule & Publish'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: LEADERBOARD */}
                {activeTab === 'leaderboard' && (
                    <div className="animate-in fade-in duration-300">
                        <StandingsTable 
                            gameId={game.id}
                            teams={teams}
                            matches={matches}
                            teamsIntoPlayoffs={game.teams_into_playoffs || 4}
                        />
                    </div>
                )}

                {/* DEVELOPMENT ONLY: SEED UTILITY */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-12 p-6 border border-dashed border-red-500/50 bg-red-500/5 rounded-sm text-center animate-in fade-in">
                        <h3 className="text-red-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Development Utility
                        </h3>
                        <p className="text-gray-400 text-xs mb-4 max-w-lg mx-auto">
                            This panel allows you to instantly inject 60 realistic dummy players to test the micro-tournament UI. Once testing is complete, you can safely tear them down to keep your platform metrics clean.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={handleSeedTournament}
                                disabled={isSeeding || isCleaning}
                                className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 rounded text-sm font-bold uppercase transition-colors"
                            >
                                {isSeeding ? 'Injecting Players...' : 'Seed Dummy Players'}
                            </button>
                            <button
                                onClick={handleCleanupTournament}
                                disabled={isSeeding || isCleaning}
                                className="px-6 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 border border-gray-500/50 rounded text-sm font-bold uppercase transition-colors"
                            >
                                {isCleaning ? 'Tearing Down...' : 'Tear Down Dummy Data'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <PlayerVerificationModal 
                isOpen={isVerificationModalOpen}
                onClose={() => setIsVerificationModalOpen(false)}
                player={selectedPlayerForVerification}
                mode="global"
                onCheckIn={handleGlobalCheckIn}
                onPhotoUpload={handlePhotoUpload}
                onWaiverOverride={handleWaiverOverride}
                isUpdating={isCheckingInGlobal}
                strictWaiverRequired={game.strict_waiver_required}
            />
        </div>
    );
}


