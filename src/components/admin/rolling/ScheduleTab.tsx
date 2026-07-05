// 🏗️ Architecture: [[ScheduleTab.md]]
import { useState, useEffect } from 'react';
import { Calendar, History, Trash2, Edit2, CheckCircle2, RotateCw, Settings2, Trophy, ChevronDown, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { scheduleNextRound, logPastMatch, updateMatchOverride, bulkScheduleSeason, generatePlayoffBracket, deleteMatchPermanently, updateSchedulingConstraints, deleteAllMatches, deleteBulkMatches } from '@/app/actions/rolling-god-mode';
import { StandingsTable } from '@/components/admin/StandingsTable';
import { PitchSideConfirmModal } from '@/components/public/PitchSideConfirmModal';

// Helper to strictly format local datetime for <input type="datetime-local">
const toLocalDatetimeString = (dateObj: string | Date) => {
    const d = new Date(dateObj);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function ScheduleTab({ matches, teams, gameId, facilityId, game, onRefresh }: any) {
    const { success, error } = useToast();
    const [processing, setProcessing] = useState(false);
    
    // Modal State
    const [confirmScheduleOpen, setConfirmScheduleOpen] = useState(false);
    const [bulkScheduleConfirmOpen, setBulkScheduleConfirmOpen] = useState(false);
    
    // History Form State
    const [showHistoryForm, setShowHistoryForm] = useState(false);

    // Constraints State
    const [showConstraints, setShowConstraints] = useState(false);
    
    const formatTimeTo12Hour = (timeString?: string) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const d = new Date();
        d.setHours(parseInt(hours), parseInt(minutes));
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const [editAmountOfFields, setEditAmountOfFields] = useState(String(game?.amount_of_fields || 1));
    const [editConstraintStartTime, setEditConstraintStartTime] = useState(game?.earliest_game_start_time || '');
    const [editConstraintEndTime, setEditConstraintEndTime] = useState(game?.latest_game_start_time || '');
    const [editHalfLength, setEditHalfLength] = useState(String(game?.half_length ?? 25));
    const [editHalftimeLength, setEditHalftimeLength] = useState(String(game?.halftime_length ?? 5));
    const [editBreakBetweenGames, setEditBreakBetweenGames] = useState(String(game?.break_between_games ?? 5));
    const [hHomeTeamId, setHHomeTeamId] = useState('');
    const [hAwayTeamId, setHAwayTeamId] = useState('');
    const [hHomeScore, setHHomeScore] = useState('');
    const [hAwayScore, setHAwayScore] = useState('');
    const [hDate, setHDate] = useState('');

    // Hydration State
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Lifecycle State
    const [seasonEndDate, setSeasonEndDate] = useState('');
    const [playoffSize, setPlayoffSize] = useState('4');

    // Accordion State: tracks which weeks are collapsed (everything expanded by default)
    const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
    const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
    const [deleteWeekConfirmOpen, setDeleteWeekConfirmOpen] = useState<{ isOpen: boolean, dateKey: string, matchIds: string[] }>({ isOpen: false, dateKey: '', matchIds: [] });
    // Sub-tab state per week: 'active' shows scheduled/completed, 'canceled' shows canceled
    const [weekTabs, setWeekTabs] = useState<Record<string, 'active' | 'canceled'>>({});

    // Edit Match Modal State
    const [editingMatch, setEditingMatch] = useState<any | null>(null);
    const [editStartTime, setEditStartTime] = useState('');
    const [editFieldName, setEditFieldName] = useState('');
    const [editHomeTeamId, setEditHomeTeamId] = useState('');
    const [editAwayTeamId, setEditAwayTeamId] = useState('');
    const [editHomeScore, setEditHomeScore] = useState('');
    const [editAwayScore, setEditAwayScore] = useState('');
    const [editStatus, setEditStatus] = useState('');

    // Optimistic Deletion State
    const [deletedMatchIds, setDeletedMatchIds] = useState<Set<string>>(new Set());

    // ───────────────────────────────────────────────────────
    // EXISTING HANDLERS (unchanged logic)
    // ───────────────────────────────────────────────────────

    const handleScheduleNextRound = async () => {
        setProcessing(true);
        try {
            const tzOffset = new Date().getTimezoneOffset();
            const res = await scheduleNextRound(gameId, teams, facilityId, tzOffset);
            if (res.success) {
                success(`Scheduled ${res.count} matches successfully.`);
                setConfirmScheduleOpen(false);
                onRefresh();
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleBulkSchedule = async () => {
        setBulkScheduleConfirmOpen(false);
        setProcessing(true);
        try {
            const tzOffset = new Date().getTimezoneOffset();
            const res = await bulkScheduleSeason(gameId, teams, facilityId, seasonEndDate, tzOffset);
            if (res.success) {
                success(`Generated ${res.count} total matches.`);
                onRefresh();
            } else {
                error(res.error || "Failed to schedule");
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteAll = async () => {
        setDeleteAllConfirmOpen(false);
        setProcessing(true);
        try {
            const res = await deleteAllMatches(gameId);
            if (res.success) {
                success("All matches have been deleted.");
                onRefresh();
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteWeek = async () => {
        const matchIds = deleteWeekConfirmOpen.matchIds;
        setDeleteWeekConfirmOpen({ isOpen: false, dateKey: '', matchIds: [] });
        setProcessing(true);
        try {
            const res = await deleteBulkMatches(matchIds, gameId);
            if (res.success) {
                success("Matches for the selected week have been deleted.");
                onRefresh();
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleTriggerPlayoffs = async () => {
        if (!confirm(`Lock standings and generate ${playoffSize}-team bracket?`)) return;
        setProcessing(true);
        try {
            const res = await generatePlayoffBracket(gameId, teams, parseInt(playoffSize), facilityId);
            if (res.success) {
                success(`Playoff Bracket Generated (${res.count} matches)`);
                onRefresh();
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleLogPastMatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const homeName = teams.find((t: any) => t.id === hHomeTeamId)?.name || '';
            const awayName = teams.find((t: any) => t.id === hAwayTeamId)?.name || '';

            await logPastMatch(gameId, hHomeTeamId, homeName, hAwayTeamId, awayName, parseInt(hHomeScore), parseInt(hAwayScore), hDate);
            success("Historical match logged.");
            setShowHistoryForm(false);
            setHHomeTeamId('');
            setHAwayTeamId('');
            setHHomeScore('');
            setHAwayScore('');
            setHDate('');
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleOverrideMatch = async (matchId: string, updates: any) => {
        if (!window.confirm('Override match status?')) return;
        setProcessing(true);
        try {
            await updateMatchOverride(matchId, gameId, updates);
            success('Match updated.');
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteMatchPermanently = async (matchId: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this match? This cannot be undone.")) return;
        setProcessing(true);
        try {
            await deleteMatchPermanently(matchId, gameId);
            setDeletedMatchIds(prev => new Set(prev).add(matchId));
            success('Match permanently deleted.');
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateConstraints = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const totalSlotTime = (parseInt(editHalfLength) || 0) * 2 + (parseInt(editHalftimeLength) || 0) + (parseInt(editBreakBetweenGames) || 0);
            
            await updateSchedulingConstraints(gameId, {
                amount_of_fields: parseInt(editAmountOfFields),
                earliest_game_start_time: editConstraintStartTime,
                latest_game_start_time: editConstraintEndTime,
                half_length: parseInt(editHalfLength),
                halftime_length: parseInt(editHalftimeLength),
                break_between_games: parseInt(editBreakBetweenGames),
                total_game_time: totalSlotTime
            });
            success("Scheduling constraints updated.");
            setShowConstraints(false);
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    // ───────────────────────────────────────────────────────
    // EDIT MODAL HANDLERS
    // ───────────────────────────────────────────────────────

    // Open the edit modal and pre-fill form fields from the match data
    const openEditModal = (match: any) => {
        setEditingMatch(match);
        // Convert ISO timestamp to datetime-local format strictly
        setEditStartTime(toLocalDatetimeString(match.start_time));
        setEditFieldName(match.field_name || '');
        setEditHomeTeamId(match.home_team_id || '');
        setEditAwayTeamId(match.away_team_id || '');
        setEditHomeScore(String(match.home_score ?? ''));
        setEditAwayScore(String(match.away_score ?? ''));
        setEditStatus(match.status || 'scheduled');
    };

    // Save edited match details to the database via updateMatchOverride
    const handleSaveEdit = async () => {
        if (!editingMatch) return;
        setProcessing(true);
        try {
            // Look up team names from the UUID so we also update the string columns
            const homeName = teams.find((t: any) => t.id === editHomeTeamId)?.name || editingMatch.home_team;
            const awayName = teams.find((t: any) => t.id === editAwayTeamId)?.name || editingMatch.away_team;

            await updateMatchOverride(editingMatch.id, gameId, {
                start_time: new Date(editStartTime).toISOString(),
                field_name: editFieldName,
                home_team_id: editHomeTeamId || null,
                away_team_id: editAwayTeamId || null,
                home_team: homeName,
                away_team: awayName,
                home_score: editHomeScore === '' ? 0 : parseInt(editHomeScore),
                away_score: editAwayScore === '' ? 0 : parseInt(editAwayScore),
                status: editStatus,
            });
            success('Match updated successfully.');
            setEditingMatch(null);
            onRefresh(); // Re-fetch data so accordion re-sorts to correct position
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    // ───────────────────────────────────────────────────────
    // COMPUTED DATA: Chronological sort + weekly grouping
    // ───────────────────────────────────────────────────────

    // Sort all matches by date/time ascending — handles Date objects safely via getTime()
    const sortedMatches = [...matches].sort((a: any, b: any) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Group sorted matches by calendar date for accordion display
    const groupedByDate: Record<string, any[]> = {};
    sortedMatches.forEach((match: any) => {
        const dateKey = new Date(match.start_time).toLocaleDateString('en-US', {
            weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
        });
        if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
        groupedByDate[dateKey].push(match);
    });

    const dateEntries = Object.entries(groupedByDate);

    // Toggle individual accordion blocks open/closed
    const toggleWeek = (key: string) => {
        setCollapsedWeeks(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleExpandAll = () => {
        setCollapsedWeeks(new Set());
    };

    const handleCollapseAll = () => {
        const allKeys = Object.keys(groupedByDate);
        setCollapsedWeeks(new Set(allKeys));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Scheduling Constraints Panel */}
            <div className="bg-[#171717] p-6 rounded-xl border border-white/10 mb-8 relative">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-gray-400" /> Scheduling Constraints
                    </h3>
                    <button 
                        onClick={() => setShowConstraints(!showConstraints)}
                        className="text-xs font-bold text-pitch-accent hover:text-white transition-colors uppercase tracking-widest"
                    >
                        {showConstraints ? 'Cancel' : 'Edit Constraints'}
                    </button>
                </div>

                {!showConstraints ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4">
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Available Fields</div>
                            <div className="text-2xl font-bold text-white">{game?.amount_of_fields || 1}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Half Length</div>
                            <div className="text-2xl font-bold text-white">{game?.half_length || 25}m</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Halftime</div>
                            <div className="text-2xl font-bold text-white">{game?.halftime_length || 5}m</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Break</div>
                            <div className="text-2xl font-bold text-white">{game?.break_between_games || 5}m</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Booking Window Start</div>
                            <div className="text-2xl font-bold text-white">
                                {isMounted ? (formatTimeTo12Hour(game?.earliest_game_start_time) || 'N/A') : '...'}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Booking Window End</div>
                            <div className="text-2xl font-bold text-white">
                                {isMounted ? (formatTimeTo12Hour(game?.latest_game_start_time) || 'N/A') : '...'}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 text-pitch-accent">Total Slot Time</div>
                            <div className="text-2xl font-bold text-pitch-accent">{game?.total_game_time || 60}m</div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleUpdateConstraints} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-pitch-secondary mb-1">Available Fields</label>
                                <input type="number" min="1" value={editAmountOfFields} onChange={(e) => setEditAmountOfFields(e.target.value)} className="bg-black/50 border border-white/10 rounded-sm p-3 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-pitch-secondary mb-1">Booking Window Start</label>
                                <input type="time" step="900" value={editConstraintStartTime} onChange={(e) => setEditConstraintStartTime(e.target.value)} className="bg-black/50 border border-white/10 rounded-sm p-3 text-white [color-scheme:dark]" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-pitch-secondary mb-1">Booking Window End</label>
                                <input type="time" step="900" value={editConstraintEndTime} onChange={(e) => setEditConstraintEndTime(e.target.value)} className="bg-black/50 border border-white/10 rounded-sm p-3 text-white [color-scheme:dark]" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-pitch-secondary mb-1">Half Length (min)</label>
                                <input type="number" min="1" value={editHalfLength} onChange={(e) => setEditHalfLength(e.target.value)} className="bg-black/50 border border-white/10 rounded-sm p-3 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-pitch-secondary mb-1">Halftime (min)</label>
                                <input type="number" min="0" value={editHalftimeLength} onChange={(e) => setEditHalftimeLength(e.target.value)} className="bg-black/50 border border-white/10 rounded-sm p-3 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-pitch-secondary mb-1">Break (min)</label>
                                <input type="number" min="0" value={editBreakBetweenGames} onChange={(e) => setEditBreakBetweenGames(e.target.value)} className="bg-black/50 border border-white/10 rounded-sm p-3 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-pitch-secondary mb-1 text-pitch-accent">Total Slot Time</label>
                                <div className="bg-black/50 border border-white/10 rounded-sm p-3 text-pitch-accent font-bold">
                                    {(parseInt(editHalfLength) || 0) * 2 + (parseInt(editHalftimeLength) || 0) + (parseInt(editBreakBetweenGames) || 0)} min
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2 bg-pitch-accent text-black font-black uppercase text-[10px] tracking-widest rounded hover:bg-white transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : 'Save Constraints'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Bulk & Playoffs Row */}
            <div className="bg-black/40 border border-white/10 p-6 rounded-lg mb-8">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-6 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Season Lifecycle & Auto-Scheduler
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Bulk Generation Zone */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                            Target Season End Date (Pre-Playoffs)
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input 
                                type="date" 
                                className="bg-pitch-black border border-white/20 p-3 text-white text-sm font-bold focus:border-blue-500 outline-none rounded shrink-0"
                                value={seasonEndDate}
                                onChange={(e) => setSeasonEndDate(e.target.value)}
                            />
                            <button 
                                onClick={() => {
                                    if (!seasonEndDate) {
                                        error("Select a Season End Date first.");
                                        return;
                                    }
                                    setBulkScheduleConfirmOpen(true);
                                }}
                                disabled={processing || !seasonEndDate}
                                className="w-full sm:w-auto px-6 py-3 bg-blue-500/10 text-blue-400 border border-blue-500/50 font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 hover:text-white transition-colors rounded disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <RotateCw className="w-3 h-3" /> Bulk Schedule Season
                            </button>
                        </div>
                    </div>

                    {/* Playoff Engine Zone */}
                    <div className="space-y-4 lg:border-l lg:border-white/10 lg:pl-8">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                            Playoff Engine
                        </label>
                        <div className="flex gap-3">
                            <select 
                                className="bg-pitch-black border border-white/20 p-3 text-white text-sm font-bold focus:border-yellow-500 outline-none rounded shrink-0"
                                value={playoffSize}
                                onChange={(e) => setPlayoffSize(e.target.value)}
                            >
                                <option value="4">Top 4 Bracket</option>
                                <option value="8">Top 8 Bracket</option>
                            </select>
                            <button 
                                onClick={handleTriggerPlayoffs}
                                disabled={processing}
                                className="w-full px-6 py-3 bg-yellow-500 text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors rounded shadow-[0_0_20px_rgba(234,179,8,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Trophy className="w-3 h-3" /> Trigger Playoffs
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase italic tracking-widest">
                            Matches will be tagged as PLAYOFF and excluded from aggregate standings.
                        </p>
                    </div>
                </div>
            </div>

            {/* Generate & Historical Log Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-pitch-accent" /> Granular Management
                </h3>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowHistoryForm(!showHistoryForm)}
                        className="px-4 py-2 border border-white/20 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <History className="w-3 h-3" /> Log Past Match
                    </button>
                    <button 
                        onClick={() => setConfirmScheduleOpen(true)}
                        disabled={processing}
                        className="px-4 py-2 bg-pitch-accent text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors flex items-center gap-2"
                    >
                        <RotateCw className="w-3 h-3" /> Schedule Next Round
                    </button>
                </div>
            </div>

            {/* Historical Log Form */}
            {showHistoryForm && (
                <div className="bg-black/40 border border-pitch-accent/30 p-6 rounded-lg mb-8">
                    <h4 className="text-pitch-accent font-black uppercase italic tracking-wider mb-4">Manual Historical Entry</h4>
                    <form onSubmit={handleLogPastMatch} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Home Team</label>
                                <select required className="w-full bg-black border border-white/20 p-2 text-white text-xs uppercase" value={hHomeTeamId} onChange={(e) => setHHomeTeamId(e.target.value)}>
                                    <option value="">SELECT TEAM</option>
                                    {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Away Team</label>
                                <select required className="w-full bg-black border border-white/20 p-2 text-white text-xs uppercase" value={hAwayTeamId} onChange={(e) => setHAwayTeamId(e.target.value)}>
                                    <option value="">SELECT TEAM</option>
                                    {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Home Score</label>
                                <input type="number" required min="0" className="w-full bg-black border border-white/20 p-2 text-white text-xs" value={hHomeScore} onChange={(e) => setHHomeScore(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Away Score</label>
                                <input type="number" required min="0" className="w-full bg-black border border-white/20 p-2 text-white text-xs" value={hAwayScore} onChange={(e) => setHAwayScore(e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Match Date</label>
                                <input type="datetime-local" required className="w-full bg-black border border-white/20 p-2 text-white text-xs" style={{ colorScheme: 'dark' }} value={hDate} onChange={(e) => setHDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button disabled={processing} type="submit" className="px-6 py-2 bg-pitch-accent text-black font-black uppercase text-[10px] hover:bg-white transition-colors">
                                Save Historical Match
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Standings Check */}
            <div className="mb-8">
               <StandingsTable gameId={gameId} teams={teams} matches={matches} />
            </div>

            {/* Schedule Summary (Visual Balance Check) */}
            <div className="bg-[#0a0a0a] border border-white/5 p-4 rounded-lg mb-8">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <History className="w-3 h-3" /> Schedule Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {teams.map((team: any) => {
                        let played = 0;
                        let satOut = 0;
                        const opponentCounts: Record<string, number> = {};

                        // Group all non-canceled matches by Date string to figure out if they sat out
                        const matchesByDate: Record<string, any[]> = {};
                        const validMatches = (matches || []).filter((m: any) => m.status !== 'canceled');
                        validMatches.forEach((m: any) => {
                            const d = new Date(m.start_time).toDateString();
                            if (!matchesByDate[d]) matchesByDate[d] = [];
                            matchesByDate[d].push(m);
                        });

                        Object.values(matchesByDate).forEach(dayMatches => {
                            const myMatch = dayMatches.find((m: any) => m.home_team_id === team.id || m.away_team_id === team.id);
                            if (myMatch) {
                                played++;
                                const oppId = myMatch.home_team_id === team.id ? myMatch.away_team_id : myMatch.home_team_id;
                                if (oppId) {
                                    const oppTeam = teams.find((t: any) => t.id === oppId);
                                    if (oppTeam) {
                                        opponentCounts[oppTeam.name] = (opponentCounts[oppTeam.name] || 0) + 1;
                                    }
                                }
                            } else {
                                satOut++;
                            }
                        });

                        return (
                            <div key={team.id} className="flex flex-col bg-white/5 p-2 rounded border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-white uppercase truncate mr-2">{team.name}</span>
                                    <div className="flex gap-2 shrink-0">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[8px] text-gray-500 uppercase font-bold leading-none" title="Matches Played">P</span>
                                            <span className="text-[10px] font-bold text-pitch-accent leading-none mt-0.5">{played}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[8px] text-gray-500 uppercase font-bold leading-none" title="Weeks Sat Out (Bye)">S</span>
                                            <span className="text-[10px] font-bold text-yellow-500 leading-none mt-0.5">{satOut}</span>
                                        </div>
                                    </div>
                                </div>
                                {played > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-auto">
                                        {Object.entries(opponentCounts).sort((a, b) => b[1] - a[1]).map(([opp, count]) => (
                                            <span key={opp} className="text-[8px] bg-black/50 text-gray-400 px-1 py-0.5 rounded uppercase flex items-center gap-1">
                                                <span className="truncate max-w-[60px]">{opp}:</span> <span className="text-white font-bold">{count}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ───────────────────────────────────────────────────────
                CHRONOLOGICAL MATCH ACCORDION
                Matches are sorted ascending by date/time, grouped by
                calendar date into collapsible week blocks with
                Active/Canceled sub-tabs inside each accordion.
               ─────────────────────────────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" /> Match Schedule
                    </h3>
                    <div className="flex gap-2">
                        {dateEntries.length > 0 && (
                            <>
                                <button onClick={handleExpandAll} className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-colors rounded">
                                    Expand All
                                </button>
                                <button onClick={handleCollapseAll} className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-colors rounded">
                                    Collapse All
                                </button>
                                <button onClick={() => setDeleteAllConfirmOpen(true)} className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-500 font-bold uppercase tracking-widest text-[10px] hover:bg-red-500/20 transition-colors flex items-center gap-1 rounded">
                                    <Trash2 className="w-3 h-3" /> Delete All
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {dateEntries.length === 0 && (
                    <div className="text-center py-12 bg-[#171717] border border-white/10 rounded-lg">
                        <Calendar className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">No Matches Scheduled</p>
                    </div>
                )}

                {dateEntries.map(([dateKey, dateMatches], weekIdx) => {
                    // All expanded by default; only collapsed if explicitly toggled
                    const isExpanded = !collapsedWeeks.has(dateKey);
                    const validMatches = dateMatches.filter((m: any) => !deletedMatchIds.has(m.id));
                    const activeMatches = validMatches.filter((m: any) => m.status !== 'canceled');
                    const canceledMatches = validMatches.filter((m: any) => m.status === 'canceled');
                    const currentTab = weekTabs[dateKey] || 'active';
                    const displayMatches = currentTab === 'active' ? activeMatches : canceledMatches;

                    return (
                        <div key={dateKey} className="bg-[#171717] border border-white/10 rounded-lg overflow-hidden">
                            {/* Accordion Header */}
                            <button
                                onClick={() => toggleWeek(dateKey)}
                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-pitch-accent/10 border border-pitch-accent/20 rounded flex items-center justify-center text-pitch-accent font-black text-xs">
                                        W{weekIdx + 1}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black uppercase tracking-wider text-white">{dateKey}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                            {dateMatches.length} match{dateMatches.length !== 1 ? 'es' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteWeekConfirmOpen({ isOpen: true, dateKey, matchIds: validMatches.map((m: any) => m.id) });
                                        }}
                                        className="text-red-500/50 hover:text-red-400 p-1.5 bg-black/40 hover:bg-black/60 rounded border border-transparent hover:border-red-500/20 transition-colors"
                                        title="Delete Matches for this Date"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            {/* Accordion Content */}
                            {isExpanded && (
                                <div className="border-t border-white/10 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {/* Sub-Tabs: Active vs Canceled */}
                                    <div className="flex border-b border-white/5 bg-black/20">
                                        <button
                                            onClick={() => setWeekTabs(prev => ({ ...prev, [dateKey]: 'active' }))}
                                            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                                currentTab === 'active'
                                                    ? 'text-pitch-accent border-b-2 border-pitch-accent bg-pitch-accent/5'
                                                    : 'text-gray-500 hover:text-white'
                                            }`}
                                        >
                                            Active / Completed ({activeMatches.length})
                                        </button>
                                        <button
                                            onClick={() => setWeekTabs(prev => ({ ...prev, [dateKey]: 'canceled' }))}
                                            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                                currentTab === 'canceled'
                                                    ? 'text-red-400 border-b-2 border-red-500 bg-red-500/5'
                                                    : 'text-gray-500 hover:text-white'
                                            }`}
                                        >
                                            Canceled ({canceledMatches.length})
                                        </button>
                                    </div>

                                    {/* Match Cards */}
                                    <div className="p-4 space-y-2">
                                        {displayMatches.length === 0 ? (
                                            <p className="text-center py-6 text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                                {currentTab === 'active' ? 'No active matches this week' : 'No canceled matches this week'}
                                            </p>
                                        ) : displayMatches.map((m: any) => (
                                            <div key={m.id} className="bg-black/40 border border-white/5 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-white/15 transition-colors group">
                                                {/* Playoff badge */}
                                                {m.is_playoff && (
                                                    <span className="text-[#ffd700] text-[9px] font-black uppercase tracking-widest border border-[#ffd700]/30 bg-[#ffd700]/10 px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(255,215,0,0.2)]">
                                                        PLAYOFF
                                                    </span>
                                                )}

                                                {/* Matchup */}
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <span className="font-black uppercase italic text-sm text-white truncate">{m.home_team}</span>
                                                    <span className="bg-white/10 px-2.5 py-1 rounded text-pitch-accent font-black italic text-xs shrink-0">
                                                        {m.home_score} - {m.away_score}
                                                    </span>
                                                    <span className="font-black uppercase italic text-sm text-white truncate">{m.away_team}</span>
                                                </div>

                                                {/* Time */}
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                                                    {new Date(m.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                </span>

                                                {/* Field Badge */}
                                                {m.field_name && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-pitch-accent bg-pitch-accent/10 border border-pitch-accent/20 px-2 py-1 rounded shrink-0">
                                                        {m.field_name}
                                                    </span>
                                                )}

                                                {/* Status Badge */}
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border shrink-0 ${
                                                    m.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                    : m.status === 'canceled' ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    : 'bg-white/5 text-gray-400 border-white/10'
                                                }`}>{m.status}</span>

                                                {/* Action Buttons */}
                                                <div className="flex gap-1.5 shrink-0">
                                                    <button
                                                        onClick={() => openEditModal(m)}
                                                        className="p-1.5 bg-white/5 text-gray-400 hover:bg-pitch-accent hover:text-black rounded transition-colors"
                                                        title="Edit Match"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {m.status !== 'canceled' && (
                                                        <button
                                                            onClick={() => handleOverrideMatch(m.id, { status: 'canceled' })}
                                                            className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                                                            title="Cancel Match"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {m.status === 'scheduled' && (
                                                        <button
                                                            onClick={() => handleOverrideMatch(m.id, { status: 'completed' })}
                                                            className="p-1.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded transition-colors"
                                                            title="Force Complete"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {m.status === 'canceled' && (
                                                        <button
                                                            onClick={() => handleDeleteMatchPermanently(m.id)}
                                                            className="p-1.5 bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                                                            title="Delete Permanently"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ───────────────────────────────────────────────────────
                EDIT MATCH MODAL (God Mode)
                Uses <select> dropdowns populated from the teams array
                so the admin never has to type raw UUIDs.
               ─────────────────────────────────────────────────────── */}
            {editingMatch && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingMatch(null)}>
                    <div className="bg-[#171717] border border-white/10 rounded-lg w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h3 className="text-sm font-black uppercase italic tracking-widest text-pitch-accent flex items-center gap-2">
                                <Edit2 className="w-4 h-4" /> Edit Match
                            </h3>
                            <button onClick={() => setEditingMatch(null)} className="p-1 hover:bg-white/10 rounded transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Team Selectors — dropdown with names, passes UUID */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Home Team</label>
                                    <select
                                        value={editHomeTeamId}
                                        onChange={(e) => setEditHomeTeamId(e.target.value)}
                                        className="w-full bg-black border border-white/20 p-2.5 text-white text-sm font-bold rounded focus:border-pitch-accent outline-none uppercase"
                                    >
                                        <option value="">SELECT TEAM</option>
                                        {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Away Team</label>
                                    <select
                                        value={editAwayTeamId}
                                        onChange={(e) => setEditAwayTeamId(e.target.value)}
                                        className="w-full bg-black border border-white/20 p-2.5 text-white text-sm font-bold rounded focus:border-pitch-accent outline-none uppercase"
                                    >
                                        <option value="">SELECT TEAM</option>
                                        {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Scores */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Home Score</label>
                                    <input
                                        type="number" min="0"
                                        value={editHomeScore}
                                        onChange={(e) => setEditHomeScore(e.target.value)}
                                        className="w-full bg-black border border-white/20 p-2.5 text-white text-sm font-bold rounded focus:border-pitch-accent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Away Score</label>
                                    <input
                                        type="number" min="0"
                                        value={editAwayScore}
                                        onChange={(e) => setEditAwayScore(e.target.value)}
                                        className="w-full bg-black border border-white/20 p-2.5 text-white text-sm font-bold rounded focus:border-pitch-accent outline-none"
                                    />
                                </div>
                            </div>

                            {/* Time & Field */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={editStartTime}
                                        onChange={(e) => setEditStartTime(e.target.value)}
                                        className="w-full bg-black border border-white/20 p-2.5 text-white text-sm font-bold rounded focus:border-pitch-accent outline-none [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Field</label>
                                    <input
                                        type="text"
                                        value={editFieldName}
                                        onChange={(e) => setEditFieldName(e.target.value)}
                                        className="w-full bg-black border border-white/20 p-2.5 text-white text-sm font-bold rounded focus:border-pitch-accent outline-none"
                                        placeholder="e.g. Field A"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Status</label>
                                <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="w-full bg-black border border-white/20 p-2.5 text-white text-sm font-bold rounded focus:border-pitch-accent outline-none"
                                >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="canceled">Canceled</option>
                                </select>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
                            <button
                                onClick={() => setEditingMatch(null)}
                                className="px-5 py-2.5 border border-white/20 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-colors rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={processing}
                                className="px-5 py-2.5 bg-pitch-accent text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors rounded disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Next Round Confirmation Modal */}
            <PitchSideConfirmModal 
                isOpen={confirmScheduleOpen}
                onClose={() => setConfirmScheduleOpen(false)}
                onConfirm={handleScheduleNextRound}
                title="Schedule Next Round"
                description={
                    <span className="text-gray-400">
                        This action will immediately calculate pairings and schedule the next rolling round for all active teams. Are you sure you want to proceed?
                    </span>
                }
                confirmText="Execute Scheduler"
                isProcessing={processing}
            />

            {/* Bulk Schedule Confirmation Modal */}
            <PitchSideConfirmModal 
                isOpen={bulkScheduleConfirmOpen}
                onClose={() => setBulkScheduleConfirmOpen(false)}
                onConfirm={handleBulkSchedule}
                title="Bulk Schedule Matches"
                description={`Are you sure you want to bulk schedule remaining weeks up to ${seasonEndDate}? This will automatically generate and assign matches based on the current team configurations.`}
                confirmText="Generate Schedule"
                isProcessing={processing}
            />

            {/* Delete All Matches Confirmation Modal */}
            <PitchSideConfirmModal 
                isOpen={deleteAllConfirmOpen}
                onClose={() => setDeleteAllConfirmOpen(false)}
                onConfirm={handleDeleteAll}
                title="Delete All Matches"
                description="Are you absolutely sure you want to delete ALL matches for this league? This action cannot be undone."
                confirmText="Delete All"
                isProcessing={processing}
            />

            {/* Delete Week Matches Confirmation Modal */}
            <PitchSideConfirmModal 
                isOpen={deleteWeekConfirmOpen.isOpen}
                onClose={() => setDeleteWeekConfirmOpen({ isOpen: false, dateKey: '', matchIds: [] })}
                onConfirm={handleDeleteWeek}
                title={`Delete Matches for ${deleteWeekConfirmOpen.dateKey}`}
                description="Are you sure you want to delete all matches for this date? This action cannot be undone."
                confirmText="Delete Matches"
                isProcessing={processing}
            />
        </div>
    );
}
