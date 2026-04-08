'use client';

import { useState } from 'react';
import { Users, CreditCard, Lock, Unlock, Loader2, AlertCircle, CheckCircle2, UserMinus, UserPlus, Calendar, Trophy, MoreVertical, Ban, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processLeaguePayments } from '@/app/actions/process-league-payments';
import { generateLeagueSchedule, cancelMatch, rescheduleMatch } from '@/app/actions/league-actions';
import { seedPlayoffBracket } from '@/app/actions/playoff-actions';
import { useToast } from '@/components/ui/Toast';
import { StandingsTable } from '@/components/admin/StandingsTable';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


interface Registration {
    id: string;
    user_id: string;
    team_id: string | null;
    role: string;
    payment_status: string;
    payment_error?: string;
    teams?: {
        name: string;
    };
    profiles?: {
        full_name: string;
        email: string;
    };
}

interface AdminLeagueControlProps {
    leagueId: string;
    leagueTitle: string;
    rosterFreezeDate: string | null;
    registrations: Registration[];
    matches: any[];
    teams: any[];
    facilityId: string;
    startDate: string;
    isLeagueCompleted: boolean;
    onRefresh: () => void;
}

export function AdminLeagueControl({ 
    leagueId, 
    leagueTitle, 
    rosterFreezeDate, 
    registrations,
    matches,
    teams,
    facilityId,
    startDate,
    isLeagueCompleted,
    onRefresh 
}: AdminLeagueControlProps) {
    const [processing, setProcessing] = useState(false);
    const [scheduling, setScheduling] = useState(false);
    const [reschedulingMatch, setReschedulingMatch] = useState<any>(null);
    const [newTime, setNewTime] = useState('');
    
    // Manual Match State
    const [creatingManualMatch, setCreatingManualMatch] = useState(false);
    const [manualHomeTeam, setManualHomeTeam] = useState('');
    const [manualAwayTeam, setManualAwayTeam] = useState('');
    const [manualDate, setManualDate] = useState('');
    const [manualField, setManualField] = useState('Field 1');
    
    const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
    const { success, error } = useToast();

    const isRosterFrozen = rosterFreezeDate ? new Date() > new Date(rosterFreezeDate) : false;
    const canSeedPlayoffs = matches.length > 0 && matches.every(m => m.status === 'completed' || m.status === 'canceled');

    const handleGenerateSchedule = async () => {
        if (!confirm('Generate round-robin schedule for this league? This will check for facility overlaps.')) return;
        setScheduling(true);
        try {
            const teamNames = teams.map(t => t.name);
            const res = await generateLeagueSchedule(leagueId, teamNames, startDate, 4, facilityId);
            if (res.success) {
                success(`Generated ${res.count} matches successfully.`);
                onRefresh();
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setScheduling(false);
        }
    };

    const handleScheduleNextRound = async () => {
        if (!confirm('Calculate pairings and schedule the next rolling round?')) return;
        setScheduling(true);
        try {
            const { scheduleNextRound } = await import('@/app/actions/league-actions');
            const teamNames = teams.map(t => t.name);
            const res = await scheduleNextRound(leagueId, teamNames, facilityId);
            if (res.success) {
                if (res.byeTeam) {
                    success(`Scheduled ${res.count} matches. (BYE week for: ${res.byeTeam})`);
                } else {
                    success(`Scheduled ${res.count} matches successfully.`);
                }
                onRefresh();
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setScheduling(false);
        }
    };

    const handleCancelMatch = async (matchId: string) => {
        if (!confirm('Are you sure you want to cancel this match? It will be removed from standings math.')) return;
        try {
            await cancelMatch(matchId, leagueId);
            success('Match canceled.');
            onRefresh();
        } catch (err: any) {
            error(err.message);
        }
    };

    const handleReschedule = async () => {
        if (!newTime) return;
        setProcessing(true);
        try {
            await rescheduleMatch(reschedulingMatch.id, leagueId, newTime, reschedulingMatch.field_name || 'Field 1');
            success('Match rescheduled.');
            setReschedulingMatch(null);
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleCreateManualMatch = async () => {
        if (!manualHomeTeam || !manualAwayTeam || !manualDate) return;
        if (manualHomeTeam === manualAwayTeam) {
            error("A team cannot play itself.");
            return;
        }
        setProcessing(true);
        try {
            const { createManualMatch } = await import('@/app/actions/league-actions');
            await createManualMatch(leagueId, manualHomeTeam, manualAwayTeam, manualDate, manualField);
            success('Manual match created successfully.');
            setCreatingManualMatch(false);
            setManualHomeTeam('');
            setManualAwayTeam('');
            setManualDate('');
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleSeedPlayoffs = async () => {
        if (!confirm('Seed the knockout bracket based on current standings?')) return;
        setProcessing(true);
        try {
            const res = await seedPlayoffBracket(leagueId);
            success(`Seeded ${res.count} playoff matches.`);
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };


    const handleProcessPayments = async () => {
        if (!confirm('Are you sure you want to lock rosters and process all pending payments? This will charge saved cards for all "card_saved" registrations.')) {
            return;
        }

        setProcessing(true);
        try {
            const result = await processLeaguePayments(leagueId);
            if (result.success) {
                success(`Processed ${result.summary?.success} payments successfully. ${result.summary?.failed} failed.`);
                onRefresh();
            } else {
                error(result.error || 'Failed to process payments.');
            }
        } catch (err: any) {
            error(err.message || 'An unexpected error occurred.');
        } finally {
            setProcessing(false);
        }
    };

    const handleToggleRegistration = async () => {
        setProcessing(true);
        try {
            const { toggleLeagueRegistration } = await import('@/app/actions/league-actions');
            await toggleLeagueRegistration(leagueId, !isRosterFrozen);
            success(!isRosterFrozen ? "Registration frozen." : "Registration opened.");
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Total Registrations</div>
                    <div className="text-3xl font-black italic uppercase text-white">{registrations.length}</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Awaiting Payment</div>
                    <div className="text-3xl font-black italic uppercase text-pitch-accent">
                        {registrations.filter(r => r.payment_status === 'card_saved').length}
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Roster Status</div>
                            <div className={cn(
                                "text-xl font-black uppercase italic flex items-center gap-2",
                                isRosterFrozen ? "text-red-500" : "text-green-500"
                            )}>
                                {isRosterFrozen ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                                {isRosterFrozen ? 'Frozen' : 'Open'}
                            </div>
                        </div>
                        <button
                            onClick={handleToggleRegistration}
                            disabled={processing}
                            className={cn(
                                "px-4 py-2 font-black uppercase tracking-widest text-[9px] rounded-sm transition-all border",
                                isRosterFrozen ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-black" : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white"
                            )}
                        >
                            {isRosterFrozen ? 'Unlock' : 'Freeze'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="bg-pitch-card border border-white/5 rounded-lg p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#cbff00]" />
                <div className="space-y-2">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Stripe "Lock & Charge"</h3>
                    <p className="text-sm text-gray-500 max-w-md">
                        Execute secure off-session charges for all registrations with saved cards. 
                        This will strictly follow Stripe safety protocols and update roster statuses.
                    </p>
                </div>
                <button
                    onClick={handleProcessPayments}
                    disabled={processing}
                    className="w-full md:w-auto px-10 py-4 bg-[#cbff00] text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(204,255,0,0.2)] rounded-sm disabled:opacity-50"
                >
                    {processing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                        </>
                    ) : (
                        <>
                            <CreditCard className="w-4 h-4" /> Lock & Charge
                        </>
                    )}
                </button>
            </div>

            {/* Reschedule Modal (Simplified Inline Version) */}
            {reschedulingMatch && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-pitch-card border border-white/10 p-8 rounded-lg max-w-md w-full space-y-6 shadow-2xl">
                        <h3 className="text-xl font-bold uppercase italic text-white">Reschedule Match</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">New Time</label>
                                <input 
                                    type="datetime-local" 
                                    className="w-full bg-black border border-white/20 p-3 rounded text-white outline-none focus:border-pitch-accent transition-colors"
                                    value={newTime}
                                    onChange={(e) => setNewTime(e.target.value)}
                                />
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded text-xs text-blue-400 italic">
                                Facility Guardrail: The system will verify this slot for overlaps before saving.
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setReschedulingMatch(null)}
                                className="flex-1 px-6 py-3 border border-white/10 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleReschedule}
                                disabled={processing || !newTime}
                                className="flex-1 px-6 py-3 bg-pitch-accent text-black font-bold uppercase tracking-widest text-[10px] hover:bg-white transition-all disabled:opacity-50"
                            >
                                {processing ? 'Verifying...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Match Modal */}
            {creatingManualMatch && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-pitch-card border border-white/10 p-8 rounded-lg max-w-md w-full space-y-6 shadow-2xl">
                        <h3 className="text-xl font-bold uppercase italic text-white">+ Manual Match</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Home Team</label>
                                <select className="w-full bg-black border border-white/20 p-3 rounded text-white outline-none focus:border-pitch-accent transition-colors" value={manualHomeTeam} onChange={(e) => setManualHomeTeam(e.target.value)}>
                                    <option value="">Select Home Team</option>
                                    {teams.map(t => <option key={`home-${t.id || t.name}`} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Away Team</label>
                                <select className="w-full bg-black border border-white/20 p-3 rounded text-white outline-none focus:border-pitch-accent transition-colors" value={manualAwayTeam} onChange={(e) => setManualAwayTeam(e.target.value)}>
                                    <option value="">Select Away Team</option>
                                    {teams.map(t => <option key={`away-${t.id || t.name}`} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Start Time</label>
                                <input 
                                    type="datetime-local" 
                                    className="w-full bg-black border border-white/20 p-3 rounded text-white outline-none focus:border-pitch-accent transition-colors"
                                    value={manualDate}
                                    onChange={(e) => setManualDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setCreatingManualMatch(false)}
                                className="flex-1 px-6 py-3 border border-white/10 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleCreateManualMatch}
                                disabled={processing || !manualHomeTeam || !manualAwayTeam || !manualDate}
                                className="flex-1 px-6 py-3 bg-pitch-accent text-black font-bold uppercase tracking-widest text-[10px] hover:bg-white transition-all disabled:opacity-50"
                            >
                                {processing ? 'Creating...' : 'Create Match'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Standings / Leaderboard Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" /> Master Leaderboard
                    </h3>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Tie-Breakers: Points &gt; GD &gt; GF
                        </span>
                        <button
                            onClick={handleSeedPlayoffs}
                            disabled={processing}
                            title="Cancels unplayed scheduled matches and generates the final knockout bracket."
                            className="px-6 py-2 bg-pitch-accent text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all disabled:opacity-30 disabled:hover:bg-pitch-accent flex items-center gap-2"
                        >
                            {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trophy className="w-3 h-3" />}
                            Close Season & Playoffs
                        </button>
                    </div>
                </div>
                <StandingsTable 
                    gameId={leagueId} 
                    teams={teams} 
                    matches={matches} 
                />
            </div>

            {/* Schedule Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-pitch-accent" /> League Schedule
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        {matches.length === 0 && (
                            <button
                                onClick={handleGenerateSchedule}
                                disabled={scheduling}
                                className="px-6 py-2 bg-pitch-accent text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2 rounded-sm"
                            >
                                {scheduling ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                Full Season
                            </button>
                        )}
                        <button
                            onClick={handleScheduleNextRound}
                            disabled={scheduling}
                            className="px-6 py-2 bg-pitch-accent text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2 rounded-sm"
                        >
                            {scheduling ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Next Round
                        </button>
                        <button
                            onClick={() => setCreatingManualMatch(true)}
                            className="px-6 py-2 border border-white/20 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center gap-2 rounded-sm"
                        >
                            + Manual Match
                        </button>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-black/40 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    <th className="px-6 py-4">Match</th>
                                    <th className="px-6 py-4">Time / Field</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {matches.map((m) => (
                                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-white uppercase italic tracking-tighter">
                                            {m.home_team} <span className="text-pitch-accent mx-2">vs</span> {m.away_team}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-white uppercase italic">
                                                {new Date(m.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">
                                                {m.field_name || 'Field 1'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border",
                                                m.status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                                m.status === 'canceled' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                            )}>
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="p-2 hover:bg-white/5 rounded-sm transition-colors text-gray-400 hover:text-white">
                                                    <MoreVertical className="w-4 h-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 bg-[#0a0a0a] border-white/10 rounded-sm">
                                                    <DropdownMenuItem 
                                                        onClick={() => { setReschedulingMatch(m); setNewTime(m.start_time.split('.')[0]); }}
                                                        className="text-[10px] font-black uppercase tracking-widest text-white hover:bg-pitch-accent hover:text-black focus:bg-pitch-accent focus:text-black cursor-pointer flex items-center gap-2 p-3"
                                                    >
                                                        <Calendar className="w-3 h-3" /> Reschedule
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleCancelMatch(m.id)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white focus:bg-red-500 focus:text-white cursor-pointer flex items-center gap-2 p-3"
                                                    >
                                                        <Ban className="w-3 h-3" /> Cancel Match
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                                {matches.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-[10px] font-black uppercase tracking-widest italic">
                                            No matches scheduled. Click "Generate Schedule" above.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Roster Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-pitch-accent" /> Active Rosters
                    </h3>
                    {isRosterFrozen && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                            Rosters Frozen - Playoff Mode
                        </div>
                    )}
                </div>

                {(() => {
                    // 1. Strict UUID Grouping
                    const teamGroups = registrations.reduce((acc: Record<string, any>, reg) => {
                        const tid = reg.team_id;
                        if (tid) {
                            if (!acc[tid]) {
                                acc[tid] = {
                                    id: tid,
                                    name: reg.teams?.name || 'Unknown Team',
                                    players: []
                                };
                            }
                            acc[tid].players.push(reg);
                        }
                        return acc;
                    }, {});

                    const freeAgents = registrations.filter(r => !r.team_id);
                    const teamList = Object.values(teamGroups);

                    return (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                            {/* Teams Accordions */}
                            <div className="xl:col-span-2 space-y-4">
                                {teamList.length === 0 ? (
                                    <div className="bg-white/5 border border-dashed border-white/10 rounded-lg p-12 text-center">
                                        <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                        <h3 className="text-lg font-bold text-gray-500 mb-1 uppercase italic tracking-tighter">No Teams Registered</h3>
                                        <p className="text-xs text-gray-600 max-w-sm mx-auto">Players in the waiting room will appear here once assigned.</p>
                                    </div>
                                ) : (
                                    teamList.map((team: any) => {
                                        const isExpanded = expandedTeams[team.id];
                                        const captain = team.players.find((p: any) => p.role === 'captain') || team.players[0];
                                        const captainName = captain?.profiles?.full_name || 'No Captain Assigned';

                                        return (
                                            <div key={team.id} className="bg-pitch-card border border-white/5 rounded-lg overflow-hidden transition-all hover:border-white/10">
                                                {/* Accordion Header */}
                                                <button 
                                                    onClick={() => setExpandedTeams(prev => ({ ...prev, [team.id]: !prev[team.id] }))}
                                                    className="w-full bg-black/40 p-5 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-1 h-8 bg-pitch-accent" />
                                                        <div>
                                                            <h3 className="font-black uppercase tracking-wider text-lg text-white italic">{team.name}</h3>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                                                                <span className="text-pitch-secondary">Captain:</span> {captainName}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-8">
                                                        <div className="text-right hidden sm:block">
                                                            <div className="text-sm font-black text-white">{team.players.length} Players</div>
                                                            <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-0.5">Verified Roster</div>
                                                        </div>
                                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                                    </div>
                                                </button>

                                                {/* Accordion Body */}
                                                {isExpanded && (
                                                    <div className="border-t border-white/5 bg-black/20 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left">
                                                                <thead className="bg-black/50 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                                                                    <tr>
                                                                        <th className="px-6 py-3">Player</th>
                                                                        <th className="px-6 py-3">Payment Status</th>
                                                                        <th className="px-6 py-3 text-right">Actions</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-white/5">
                                                                    {team.players.map((p: any) => (
                                                                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                                                            <td className="px-6 py-4">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-sm font-bold text-white uppercase">{p.profiles?.full_name || 'Anonymous'}</span>
                                                                                    {p.role === 'captain' && (
                                                                                        <span className="bg-pitch-accent text-black text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">Capt</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-[9px] text-gray-500 font-medium">{p.profiles?.email}</div>
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <div className="flex items-center gap-2">
                                                                                    {p.payment_status === 'paid' ? (
                                                                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                                                    ) : p.payment_status === 'failed' ? (
                                                                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                                                                    ) : (
                                                                                        <div className={cn("w-2 h-2 rounded-full", p.payment_status === 'card_saved' ? "bg-blue-500" : "bg-yellow-500")} />
                                                                                    )}
                                                                                    <span className={cn(
                                                                                        "text-[10px] font-black uppercase tracking-widest",
                                                                                        p.payment_status === 'paid' ? "text-green-500" : 
                                                                                        p.payment_status === 'failed' ? "text-red-500" : 
                                                                                        p.payment_status === 'card_saved' ? "text-blue-500" : "text-yellow-500"
                                                                                    )}>
                                                                                        {p.payment_status.replace('_', ' ')}
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4 text-right">
                                                                                {!isRosterFrozen ? (
                                                                                    <div className="invisible group-hover:visible flex items-center justify-end gap-2">
                                                                                        <button 
                                                                                            className="p-2 bg-red-500/10 text-red-500 rounded-sm hover:bg-red-500 hover:text-white transition-all"
                                                                                            title="Remove Player"
                                                                                        >
                                                                                            <UserMinus className="w-4 h-4" />
                                                                                        </button>
                                                                                        <button 
                                                                                            className="p-2 bg-pitch-accent/10 text-pitch-accent rounded-sm hover:bg-pitch-accent hover:text-black transition-all"
                                                                                            title="Add Substitute"
                                                                                        >
                                                                                            <UserPlus className="w-4 h-4" />
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <Lock className="w-4 h-4 text-gray-700 ml-auto" />
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
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

                            {/* Free Agent Waiting Room */}
                            <div className="xl:col-span-1 border border-white/10 bg-black/40 rounded-lg p-6 relative overflow-hidden h-fit">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-pitch-accent/5 rounded-full blur-3xl pointer-events-none" />
                                <h3 className="text-lg font-black italic uppercase text-pitch-accent mb-6 flex items-center gap-2">
                                    <Users className="w-5 h-5" /> Free Agent Waiting Room
                                </h3>

                                {freeAgents.length === 0 ? (
                                    <div className="py-8 text-center bg-white/[0.02] border border-dashed border-white/5 rounded">
                                        <p className="text-xs text-gray-500 font-black uppercase tracking-widest">Room Empty</p>
                                        <p className="text-[10px] text-gray-600 mt-1">All agents securely assigned.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {freeAgents.map(p => (
                                            <div key={p.id} className="bg-white/5 border border-white/10 p-4 rounded-lg group hover:border-pitch-accent/30 transition-all">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <div className="text-sm font-black text-white uppercase italic">{p.profiles?.full_name || 'Anonymous'}</div>
                                                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{p.role}</div>
                                                    </div>
                                                    <div className={cn(
                                                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                                                        p.payment_status === 'paid' ? "border-green-500/30 text-green-500" : "border-yellow-500/30 text-yellow-500"
                                                    )}>
                                                        {p.payment_status === 'paid' ? 'Paid' : 'Pending'}
                                                    </div>
                                                </div>
                                                <button className="w-full py-2 bg-pitch-accent/10 border border-pitch-accent/20 text-pitch-accent rounded font-black uppercase tracking-widest text-[9px] hover:bg-pitch-accent hover:text-black transition-all flex items-center justify-center gap-2">
                                                    <UserPlus className="w-3 h-3" /> Assign to Roster
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
