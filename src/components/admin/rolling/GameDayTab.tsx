import { useState, useTransition, useEffect } from 'react';
import { Users, Loader2, CreditCard, DollarSign, RotateCcw, ShieldAlert } from 'lucide-react';
import { getGameSuspensions } from '@/app/actions/suspensions';
import { processLeaguePayments } from '@/app/actions/process-league-payments';
import { toggleCashPayment, resetCashTracker } from '@/app/actions/rolling-god-mode';
import { useToast } from '@/components/ui/Toast';
import { PitchSideConfirmModal } from '@/components/public/PitchSideConfirmModal';
import { cn } from '@/lib/utils';

export function GameDayTab({ registrations, teams, gameId, game, onRefresh }: any) {
    const { success, error } = useToast();
    const [processing, setProcessing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [expandedTeams, setExpandedTeams] = useState<string[]>([]);
    // Track which specific registrations are mid-toggle to block double-clicks
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [suspendedUserIds, setSuspendedUserIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!gameId) return;
        getGameSuspensions(gameId).then(data => {
            const suspended = new Set(data.map(s => s.user_id));
            setSuspendedUserIds(suspended);
        }).catch(err => console.error(err));
    }, [gameId]);

    const toggleTeamExpansion = (id: string) => {
        setExpandedTeams(prev => 
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const isCashMode = game?.payment_collection_type?.toLowerCase().trim() === 'cash';
    const doorFee = game?.cash_amount || 0;
    const safeRegistrations = Array.isArray(registrations) ? registrations : [];

    // Financial calculations
    const paidThisWeekCount = safeRegistrations.filter((r: any) => r.cash_paid_current_round).length;
    const nightlyExpectedCash = paidThisWeekCount * doorFee;
    const seasonTotalCash = safeRegistrations.reduce((sum: number, r: any) => sum + (r.total_cash_collected || 0), 0);

    const handleProcessPayments = async () => {
        if (!confirm('Process all pending Stripe payments for card_saved registrations?')) return;
        setProcessing(true);
        try {
            const result = await processLeaguePayments(gameId);
            if (result.success) {
                success(`Processed ${result.summary?.success} payments successfully.`);
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

    const handleToggleCash = (regId: string, currentStatus: boolean) => {
        // Prevent double-clicks — if this specific ID is already processing, bail
        if (processingIds.has(regId)) return;
        setProcessingIds(prev => new Set(prev).add(regId));

        startTransition(async () => {
            try {
                const res = await toggleCashPayment(regId, !currentStatus, doorFee, gameId);
                if (res?.success) {
                    await onRefresh(); // Wait for data to fully reload before re-enabling
                } else {
                    error(res?.error || "Failed to update payment status.");
                }
            } catch(e: any) {
                error(e.message || "An unexpected error occurred.");
            } finally {
                setProcessingIds(prev => {
                    const next = new Set(prev);
                    next.delete(regId);
                    return next;
                });
            }
        });
    };

    const handleResetCash = async () => {
        setProcessing(true);
        try {
            await resetCashTracker(gameId);
            success("Weekly tracker reset.");
            setResetModalOpen(false);
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {isCashMode ? (
                <>
                    {/* ESTIMATED REVENUE LEDGER */}
                    <div className="bg-black border border-pitch-accent/30 p-6 rounded-lg mb-8 shadow-[0_0_40px_rgba(204,255,0,0.05)]">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-pitch-accent flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" /> Estimated Revenue Ledger
                                </h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic mt-1">
                                    (Financial figures are estimations based on manual front-desk check-ins)
                                </p>
                            </div>
                            <button
                                onClick={() => setResetModalOpen(true)}
                                className="px-4 py-2 border border-white/20 text-white font-black uppercase tracking-widest text-[10px] hover:text-red-500 hover:border-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 rounded"
                            >
                                <RotateCcw className="w-3 h-3" /> Reset Cash Tracker for New Week
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-pitch-card p-4 rounded border border-white/5 flex flex-col justify-center items-center">
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Nightly Expected Cash</div>
                                <div className="text-4xl font-black italic text-white">${nightlyExpectedCash}</div>
                                <div className="text-[10px] font-bold text-pitch-accent mt-1">{paidThisWeekCount} Player(s) Paid</div>
                            </div>
                            <div className="bg-pitch-card p-4 rounded border border-white/5 flex flex-col justify-center items-center">
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Season Total Estimate</div>
                                <div className="text-4xl font-black italic text-pitch-accent">${seasonTotalCash}</div>
                            </div>
                        </div>

                        {/* Per Team Breakdown */}
                        <div className="mt-6 space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-white mb-3">Per-Team Breakdown (Tonight)</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {teams.map((t: any) => {
                                    const teamRegs = safeRegistrations.filter((r: any) => r.team_id === t.id);
                                    const paidTeamCount = teamRegs.filter((r: any) => r.cash_paid_current_round).length;
                                    const expected = paidTeamCount * doorFee;
                                    return (
                                        <div key={t.id} className="bg-white/5 border border-white/10 p-3 rounded flex justify-between items-center text-xs">
                                            <span className="font-bold text-gray-300 truncate max-w-[100px] uppercase">{t.name}</span>
                                            <span className="font-black text-white">${expected}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* CASH DOOR TRACKER ROSTER */}
                    <div className="bg-pitch-card border border-white/10 rounded-lg overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black italic uppercase tracking-tighter text-white">Cash Door Tracker</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Mark players as they arrive & pay front desk (${doorFee}/player)</p>
                            </div>
                        </div>
                        
                        <div className="p-2">
                            {safeRegistrations.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">No players registered.</div>
                            ) : (
                                <div className="w-full space-y-2">
                                    {teams.map((team: any) => {
                                        const teamPlayers = safeRegistrations.filter((r: any) => r.team_id === team.id);
                                        if (teamPlayers.length === 0) return null;
                                        
                                        const paidCount = teamPlayers.filter((r: any) => r.cash_paid_current_round).length;
                                        const isExpanded = expandedTeams.includes(team.id);

                                        return (
                                            <div key={team.id} className="border border-white/5 bg-black/40 rounded-lg overflow-hidden px-4 transition-all">
                                                <button 
                                                    onClick={() => toggleTeamExpansion(team.id)}
                                                    className="w-full flex items-center justify-between py-4 focus:outline-none"
                                                >
                                                    <div className="font-black italic uppercase text-white tracking-widest">{team.name}</div>
                                                    <div className="text-[10px] font-bold tracking-widest bg-white/10 px-2 py-1 rounded text-pitch-accent uppercase">
                                                        {paidCount}/{teamPlayers.length} Paid • ${paidCount * doorFee} Collected
                                                    </div>
                                                </button>
                                                {isExpanded && (
                                                    <div className="pt-2 pb-4">
                                                        <div className="divide-y divide-white/5 border border-white/5 rounded">
                                                            {teamPlayers.map((reg: any) => {
                                                                const isCaptain = team.captain_id === reg.user_id;
                                                                const displayRole = isCaptain ? "Captain" : (reg.role || 'Player');
                                                                return (
                                                                    <div key={reg.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                                        <div>
                                                                            <div className="font-bold text-white uppercase text-sm flex items-center gap-2">
                                                                                {reg.profiles.full_name || 'Unknown Player'}
                                                                                {isCaptain && <span className="text-[9px] bg-pitch-accent text-black px-1.5 py-0.5 rounded font-black tracking-widest">C</span>}
                                                                                {suspendedUserIds.has(reg.user_id) && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> SUSPENDED</span>}
                                                                            </div>
                                                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                                                Role: {displayRole}
                                                                            </div>
                                                                        </div>
                                                                    <button
                                                                        onClick={() => handleToggleCash(reg.id, reg.cash_paid_current_round)}
                                                                        disabled={processingIds.has(reg.id)}
                                                                        className={cn(
                                                                            "px-4 py-2 rounded font-black uppercase tracking-widest text-[10px] transition-all transform active:scale-95 disabled:opacity-50 min-w-[120px]",
                                                                            reg.cash_paid_current_round 
                                                                                ? "bg-pitch-accent text-black shadow-[0_0_15px_rgba(204,255,0,0.4)]"
                                                                                : "bg-white/5 border border-white/20 text-gray-400 hover:bg-white/10 hover:text-white"
                                                                        )}
                                                                    >
                                                                        {processingIds.has(reg.id) ? 'Saving...' : reg.cash_paid_current_round ? "Paid & Checked In" : `Collect $${doorFee}`}
                                                                    </button>
                                                                </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Free Agents Group */}
                                    {safeRegistrations.filter((r: any) => !r.team_id).length > 0 && (() => {
                                        const faPlayers = safeRegistrations.filter((r: any) => !r.team_id);
                                        const paidCount = faPlayers.filter((r: any) => r.cash_paid_current_round).length;
                                        const isExpanded = expandedTeams.includes('free_agents');
                                        
                                        return (
                                            <div className="border border-white/5 bg-black/40 rounded-lg overflow-hidden px-4 transition-all">
                                                <button 
                                                    onClick={() => toggleTeamExpansion('free_agents')}
                                                    className="w-full flex items-center justify-between py-4 focus:outline-none"
                                                >
                                                    <div className="font-black italic uppercase text-gray-400 tracking-widest">Free Agents (Unassigned)</div>
                                                    <div className="text-[10px] font-bold tracking-widest bg-white/10 px-2 py-1 rounded text-pitch-accent uppercase">
                                                        {paidCount}/{faPlayers.length} Paid
                                                    </div>
                                                </button>
                                                {isExpanded && (
                                                    <div className="pt-2 pb-4">
                                                        <div className="divide-y divide-white/5 border border-white/5 rounded">
                                                            {faPlayers.map((reg: any) => (
                                                                <div key={reg.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                                    <div>
                                                                        <div className="font-bold text-white uppercase text-sm flex items-center gap-2">
                                                                            {reg.profiles.full_name || 'Unknown Player'}
                                                                            {suspendedUserIds.has(reg.user_id) && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> SUSPENDED</span>}
                                                                        </div>
                                                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                                            Free Agent
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleToggleCash(reg.id, reg.cash_paid_current_round)}
                                                                        disabled={processingIds.has(reg.id)}
                                                                        className={cn(
                                                                            "px-4 py-2 rounded font-black uppercase tracking-widest text-[10px] transition-all transform active:scale-95 disabled:opacity-50 min-w-[120px]",
                                                                            reg.cash_paid_current_round 
                                                                                ? "bg-pitch-accent text-black shadow-[0_0_15px_rgba(204,255,0,0.4)]"
                                                                                : "bg-white/5 border border-white/20 text-gray-400 hover:bg-white/10 hover:text-white"
                                                                        )}
                                                                    >
                                                                        {processingIds.has(reg.id) ? 'Saving...' : reg.cash_paid_current_round ? "Paid & Checked In" : `Collect $${doorFee}`}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>

                    <PitchSideConfirmModal
                        isOpen={resetModalOpen}
                        onClose={() => setResetModalOpen(false)}
                        onConfirm={handleResetCash}
                        isProcessing={processing}
                        isDestructive={true}
                        title="Reset Cash Tracker"
                        confirmText="Reset Weekly Status"
                        description={
                            <div className="space-y-4">
                                <p>Are you sure you want to reset all "Paid" badges for the upcoming week?</p>
                                <p className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs leading-relaxed italic text-red-500 font-bold">
                                    This will set everyone back to "Unpaid" for tonight's game. Lifetime revenue estimates will NOT be erased.
                                </p>
                            </div>
                        }
                    />
                </>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-pitch-card border border-white/10 p-6 rounded-lg">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Total Registrations</div>
                            <div className="text-3xl font-black italic uppercase text-white">{safeRegistrations.length}</div>
                        </div>
                        <div className="bg-pitch-card border border-white/10 p-6 rounded-lg">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Active Squads</div>
                            <div className="text-3xl font-black italic uppercase text-white">{teams.length}</div>
                        </div>
                        <div className="bg-pitch-card border border-white/10 p-6 rounded-lg">
                            <div className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-2">Awaiting Payment</div>
                            <div className="text-3xl font-black italic uppercase text-yellow-500">
                                {safeRegistrations.filter((r: any) => r.payment_status === 'card_saved' || r.payment_status === 'pending' || r.payment_status === 'unpaid').length}
                            </div>
                        </div>
                    </div>

                    <div className="bg-pitch-card border border-white/5 rounded-lg p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#cbff00]" />
                        <div className="space-y-2">
                            <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Stripe "Lock & Charge"</h3>
                            <p className="text-sm text-gray-400 max-w-md">
                                Execute secure off-session charges for all registrations with saved cards. 
                                Useful for game-day compliance.
                            </p>
                        </div>
                        <button
                            onClick={handleProcessPayments}
                            disabled={processing}
                            className="w-full md:w-auto px-10 py-4 bg-[#cbff00] text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(204,255,0,0.2)] rounded-sm disabled:opacity-50"
                        >
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                            Lock & Charge
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
