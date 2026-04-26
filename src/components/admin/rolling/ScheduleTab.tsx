// 🏗️ Architecture: [[ScheduleTab.md]]
import { useState } from 'react';
import { Calendar, History, Trash2, Edit2, CheckCircle2, RotateCw, Settings2, Trophy, ChevronDown, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { scheduleNextRound, logPastMatch, updateMatchOverride, bulkScheduleSeason, generatePlayoffBracket, deleteMatchPermanently } from '@/app/actions/rolling-god-mode';
import { StandingsTable } from '@/components/admin/StandingsTable';
import { PitchSideConfirmModal } from '@/components/public/PitchSideConfirmModal';

// Helper to strictly format local datetime for <input type="datetime-local">
const toLocalDatetimeString = (dateObj: string | Date) => {
    const d = new Date(dateObj);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function ScheduleTab({ matches, teams, gameId, facilityId, onRefresh }: any) {
    const { success, error } = useToast();
    const [processing, setProcessing] = useState(false);
    
    // Modal State
    const [confirmScheduleOpen, setConfirmScheduleOpen] = useState(false);
    
    // History Form State
    const [showHistoryForm, setShowHistoryForm] = useState(false);
    const [hHomeTeamId, setHHomeTeamId] = useState('');
    const [hAwayTeamId, setHAwayTeamId] = useState('');
    const [hHomeScore, setHHomeScore] = useState('');
    const [hAwayScore, setHAwayScore] = useState('');
    const [hDate, setHDate] = useState('');

    // Lifecycle State
    const [seasonEndDate, setSeasonEndDate] = useState('');
    const [playoffSize, setPlayoffSize] = useState('4');

    // Accordion State: tracks which weeks are collapsed (everything expanded by default)
    const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
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
            const res = await scheduleNextRound(gameId, teams, facilityId);
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
        if (!seasonEndDate) {
            error("Select a Season End Date first.");
            return;
        }
        if (!confirm(`Bulk schedule remaining weeks up to ${seasonEndDate}?`)) return;
        setProcessing(true);
        try {
            const teamNames = teams.map((t: any) => t.name);
            const res = await bulkScheduleSeason(gameId, teamNames, facilityId, seasonEndDate);
            if (res.success) {
                success(`Generated ${res.count} total matches.`);
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
        if (!confirm('Override match status?')) return;
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* SEASON LIFECYCLE ZONE */}
            <div className="bg-black/80 border border-white/10 rounded-lg p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <h3 className="text-sm font-black italic uppercase text-blue-500 mb-4 flex items-center gap-2">
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
                                onClick={handleBulkSchedule}
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

            {/* ───────────────────────────────────────────────────────
                CHRONOLOGICAL MATCH ACCORDION
                Matches are sorted ascending by date/time, grouped by
                calendar date into collapsible week blocks with
                Active/Canceled sub-tabs inside each accordion.
               ─────────────────────────────────────────────────────── */}
            <div className="space-y-3">
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
                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
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
                cancelText="Cancel"
                isProcessing={processing}
            />
        </div>
    );
}
