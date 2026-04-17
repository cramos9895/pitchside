'use client';

import { useState } from 'react';
import { Users, CreditCard, Lock, Unlock, Loader2, AlertCircle, CheckCircle2, UserMinus, UserPlus, Calendar, Trophy, MoreVertical, Ban, RefreshCw, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processLeaguePayments } from '@/app/actions/process-league-payments';
import { cancelMatch, rescheduleMatch } from '@/app/actions/league-actions';
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

interface AdminRollingLeagueControlProps {
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
    // Rolling specific inputs from the game object
    teamRegistrationFee?: number | null;
    playerRegistrationFee?: number | null;
}

export function AdminRollingLeagueControl({ 
    leagueId, 
    leagueTitle, 
    rosterFreezeDate, 
    registrations,
    matches,
    teams,
    facilityId,
    startDate,
    isLeagueCompleted,
    onRefresh,
    teamRegistrationFee,
    playerRegistrationFee
}: AdminRollingLeagueControlProps) {
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

    const handleCancelMatch = async (matchId: string) => {
        if (!confirm('Are you sure you want to cancel this match?')) return;
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
        setProcessing(true);
        try {
            const { createManualMatch } = await import('@/app/actions/league-actions');
            await createManualMatch(leagueId, manualHomeTeam, manualAwayTeam, manualDate, manualField);
            success('Manual match created.');
            setCreatingManualMatch(false);
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleProcessPayments = async () => {
        if (!confirm('Process all pending payments?')) return;
        setProcessing(true);
        try {
            const result = await processLeaguePayments(leagueId);
            if (result.success) {
                success('Payments processed.');
                onRefresh();
            } else {
                error(result.error || 'Failed.');
            }
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Total Regs</div>
                    <div className="text-3xl font-black italic uppercase text-white">{registrations.length}</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#cbff00] mb-2">Deposit Status</div>
                    <div className="text-3xl font-black italic uppercase text-white">
                        {registrations.filter(r => r.payment_status === 'paid').length} / {registrations.length}
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Active Teams</div>
                    <div className="text-3xl font-black italic uppercase text-white">{teams.length}</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Roster status</div>
                    <div className={cn(
                        "text-xl font-black uppercase italic flex items-center gap-2",
                        isRosterFrozen ? "text-red-500" : "text-green-500"
                    )}>
                        {isRosterFrozen ? 'Locked' : 'Open'}
                    </div>
                </div>
            </div>

            {/* Rolling Financial Tracking */}
            <div className="bg-pitch-card border border-white/5 rounded-lg p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#cbff00]" />
                <div className="space-y-2">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Rolling League Collections</h3>
                    <p className="text-sm text-gray-500 max-w-md">
                        Tracking for Team Deposits (${teamRegistrationFee || 0}) and Individual Fees (${playerRegistrationFee || 0}).
                        Click below to reconcile with Stripe.
                    </p>
                </div>
                <button
                    onClick={handleProcessPayments}
                    disabled={processing}
                    className="w-full md:w-auto px-10 py-4 bg-[#cbff00] text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(204,255,0,0.2)] rounded-sm disabled:opacity-50"
                >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    <span>Process Deposits</span>
                </button>
            </div>

            {/* Standings Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" /> Rolling Leaderboard
                    </h3>
                </div>
                <StandingsTable 
                    gameId={leagueId} 
                    teams={teams} 
                    matches={matches} 
                />
            </div>

            {/* Schedule Section - Simplified */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#cbff00]" /> Match Stream
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setCreatingManualMatch(true)}
                            className="px-6 py-2 bg-[#cbff00] text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all flex items-center gap-2 rounded-sm"
                        >
                            + Add Match
                        </button>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <tr>
                                    <th className="px-6 py-4">Matchup</th>
                                    <th className="px-6 py-4">Kickoff / Pitch</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Settings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {matches.map((m) => (
                                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-white uppercase italic tracking-tighter">
                                            {m.home_team} <span className="text-[#cbff00] mx-2">vs</span> {m.away_team}
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
                                                        className="text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#cbff00] hover:text-black focus:bg-[#cbff00] focus:text-black cursor-pointer flex items-center gap-2 p-3"
                                                    >
                                                        <Calendar className="w-3 h-3" /> Reschedule
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleCancelMatch(m.id)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white focus:bg-red-500 focus:text-white cursor-pointer flex items-center gap-2 p-3"
                                                    >
                                                        <Ban className="w-3 h-3" /> Cancel
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Roster Section with Deposit Tracking */}
            <div className="space-y-4">
                <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#cbff00]" /> Team Rosters & Deposits
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                    {teams.map((team: any, index: number) => {
                        const stableId = team.id || team.name || `team-${index}`;
                        const isExpanded = expandedTeams[stableId];
                        const teamRegs = registrations.filter(r => 
                            (team.id && r.team_id === team.id) || 
                            r.teams?.name === team.name
                        );
                        const captain = teamRegs.find(r => r.role === 'captain');
                        const isPaid = teamRegs.some(r => r.payment_status === 'paid');

                        return (
                            <div key={stableId} className="bg-pitch-card border border-white/5 rounded-lg overflow-hidden">
                                <button 
                                    onClick={() => setExpandedTeams(prev => ({ ...prev, [stableId]: !prev[stableId] }))}
                                    className="w-full bg-black/40 p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-1 h-8", isPaid ? "bg-green-500" : "bg-orange-500")} />
                                        <div className="text-left">
                                            <h3 className="font-black uppercase tracking-wider text-lg text-white italic">{team.name}</h3>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                Captain: {captain?.profiles?.full_name || 'TBD'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="hidden sm:flex flex-col items-end">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border",
                                                isPaid ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                            )}>
                                                {isPaid ? 'Deposit Paid' : 'Deposit Pending'}
                                            </span>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="p-4 border-t border-white/5 bg-black/20">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-[8px] font-black uppercase tracking-widest text-gray-500">
                                                    <th className="px-4 py-2">Player</th>
                                                    <th className="px-4 py-2">Role</th>
                                                    <th className="px-4 py-2">Account</th>
                                                    <th className="px-4 py-2 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {teamRegs.map((reg: any) => (
                                                    <tr key={reg.id} className="text-xs border-t border-white/5">
                                                        <td className="px-4 py-3 font-bold text-white uppercase">{reg.profiles?.full_name}</td>
                                                        <td className="px-4 py-3 text-gray-500 uppercase font-bold text-[10px]">{reg.role}</td>
                                                        <td className="px-4 py-3 text-gray-500 text-[10px]">{reg.profiles?.email}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                                                                reg.payment_status === 'paid' ? "text-green-500 bg-green-500/10" : "text-gray-500 bg-white/5"
                                                            )}>
                                                                {reg.payment_status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modals for reschedule and manual match - simplified logic for brevity */}
            {creatingManualMatch && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                    <div className="bg-pitch-card border border-white/10 p-8 rounded-lg max-w-md w-full space-y-6">
                        <h3 className="text-xl font-black italic uppercase text-white">Manual Pitch Assignment</h3>
                        <div className="space-y-4">
                            <select className="w-full bg-black border border-white/20 p-3 rounded text-white text-xs font-bold uppercase" value={manualHomeTeam} onChange={(e) => setManualHomeTeam(e.target.value)}>
                                <option value="">Home Team</option>
                                {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                            </select>
                            <select className="w-full bg-black border border-white/20 p-3 rounded text-white text-xs font-bold uppercase" value={manualAwayTeam} onChange={(e) => setManualAwayTeam(e.target.value)}>
                                <option value="">Away Team</option>
                                {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                            </select>
                            <input type="datetime-local" className="w-full bg-black border border-white/20 p-3 rounded text-white text-xs" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setCreatingManualMatch(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-gray-500">Cancel</button>
                            <button onClick={handleCreateManualMatch} className="flex-1 py-3 bg-[#cbff00] text-black font-black uppercase text-[10px]">Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
