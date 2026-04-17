import { useState } from 'react';
import { Users, UserPlus, FilePlus2, RefreshCw, Handshake, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createManualTeam, updateTeamDetails, transferPlayer, draftAutoTeam } from '@/app/actions/rolling-god-mode';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { isLeagueLocked } from '@/lib/league-utils';

export function SquadsTab({ registrations, teams, gameId, game, onRefresh }: any) {
    const { success, error } = useToast();
    const [processing, setProcessing] = useState(false);
    
    // Modal States
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [transferTargetReg, setTransferTargetReg] = useState<{ id: string, currentTeamId: string | null } | null>(null);
    const [selectedTransferTeamId, setSelectedTransferTeamId] = useState<string>('');

    // Filter Free Agents
    const freeAgents = registrations.filter((r: any) => !r.team_id);
    const hasEnoughForDraft = freeAgents.length >= 5; // Configurable minimum

    const submitCreateTeam = async () => {
        if (!newTeamName.trim()) {
            error("Team name cannot be empty.");
            return;
        }

        setProcessing(true);
        try {
            await createManualTeam(gameId, newTeamName.trim());
            success("Team created successfully.");
            setCreateModalOpen(false);
            setNewTeamName('');
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleTransfer = (regId: string, currentTeamId: string | null) => {
        setTransferTargetReg({ id: regId, currentTeamId });
        setSelectedTransferTeamId('');
        setTransferModalOpen(true);
    };

    const submitTransfer = async () => {
        if (!transferTargetReg || !selectedTransferTeamId) {
            error("Select a team to transfer to.");
            return;
        }

        setProcessing(true);
        try {
            await transferPlayer(transferTargetReg.id, selectedTransferTeamId, gameId);
            success("Player transferred successfully.");
            setTransferModalOpen(false);
            setTransferTargetReg(null);
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleAutoDraft = async () => {
        if (!confirm(`Are you sure you want to draft all ${freeAgents.length} free agents into a new team?`)) return;
        setProcessing(true);
        try {
            const ids = freeAgents.map((f: any) => f.id);
            await draftAutoTeam(gameId, ids);
            success("Auto-Draft complete.");
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const isLocked = isLeagueLocked(game);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {isLocked && (
                <div className="bg-pitch-accent/10 border border-pitch-accent/50 text-pitch-accent py-4 px-6 rounded-lg text-center font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(204,255,0,0.15)]">
                    <ShieldAlert className="w-5 h-5" /> Publicly Locked — God Mode Active
                </div>
            )}

            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-pitch-accent" /> Squad Control
                </h3>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCreateModalOpen(true)}
                        disabled={processing}
                        className="px-4 py-2 border border-white/20 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <FilePlus2 className="w-3 h-3" /> New Squad
                    </button>
                    {hasEnoughForDraft && (
                        <button 
                            onClick={handleAutoDraft}
                            disabled={processing}
                            className="px-4 py-2 bg-pitch-accent text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors flex items-center gap-2"
                        >
                            <Handshake className="w-3 h-3" /> Draft Team from Free Agents
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team: any) => {
                    const roster = registrations.filter((r: any) => r.team_id === team.id || r.teams?.name === team.name);
                    return (
                        <div key={team.id || team.name} className="bg-pitch-card border border-white/5 rounded p-4">
                            <h4 className="text-white font-black italic uppercase tracking-wider text-lg border-b border-white/10 pb-2 mb-4">
                                {team.name}
                            </h4>
                            <table className="w-full text-left">
                                <tbody>
                                    {roster.map((p: any) => (
                                        <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 group">
                                            <td className="py-2 px-2 text-sm text-white font-bold uppercase">{p.profiles?.full_name}</td>
                                            <td className="py-2 px-2 text-[10px] text-gray-500 uppercase font-black tracking-widest">{p.role}</td>
                                            <td className="py-2 px-2 text-right">
                                                <button 
                                                    onClick={() => handleTransfer(p.id, team.id)}
                                                    className="invisible group-hover:visible text-[9px] px-2 py-1 bg-white/10 hover:bg-pitch-accent hover:text-black font-black uppercase tracking-widest transition-colors rounded-sm text-gray-400"
                                                >
                                                    Transfer
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {roster.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="py-4 text-center text-[10px] text-gray-500 font-bold uppercase">Empty Roster</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>

        {freeAgents.length > 0 && (
            <div className="mt-8 bg-pitch-card border border-pitch-accent/20 rounded p-6">
                <h4 className="text-pitch-accent font-black italic uppercase tracking-wider text-lg mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5" /> Free Agent Pool ({freeAgents.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {freeAgents.map((f: any) => (
                        <div key={f.id} className="bg-black/40 border border-white/10 p-3 rounded">
                            <div className="text-sm text-white font-bold uppercase">{f.profiles?.full_name}</div>
                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{f.payment_status}</div>
                            <button 
                                onClick={() => handleTransfer(f.id, 'none')}
                                className="mt-2 w-full py-1 text-[9px] bg-white/5 hover:bg-white/10 font-black uppercase tracking-widest text-white transition-colors"
                            >
                                Assign
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* MODALS */}
        
        {createModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-pitch-card border border-white/10 w-full max-w-md p-6 rounded-lg shadow-2xl relative">
                    <h2 className="font-heading text-2xl font-black italic text-white uppercase mb-4 tracking-tighter">New Squad</h2>
                    <input
                        type="text"
                        placeholder="Enter Team Name..."
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="w-full bg-black border border-white/10 text-white p-4 uppercase font-bold text-sm focus:outline-none focus:border-pitch-accent transition-colors"
                        autoFocus
                    />
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => setCreateModalOpen(false)}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-xs transition-colors rounded border border-white/10"
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submitCreateTeam}
                            className="flex-1 py-3 bg-pitch-accent hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-xs transition-colors rounded"
                            disabled={processing || !newTeamName.trim()}
                        >
                            {processing ? 'Creating...' : 'Create Team'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {transferModalOpen && transferTargetReg && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-pitch-card border border-white/10 w-full max-w-md p-6 rounded-lg shadow-2xl relative">
                    <h2 className="font-heading text-2xl font-black italic text-white uppercase mb-2 tracking-tighter">Assign Player</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-4">Select an existing squad to transfer this player into.</p>
                    
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                        {teams.filter((t: any) => t.id !== transferTargetReg.currentTeamId).map((t: any) => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTransferTeamId(t.id)}
                                className={cn(
                                    "w-full text-left p-4 rounded border transition-all flex items-center justify-between group",
                                    selectedTransferTeamId === t.id
                                        ? "border-pitch-accent bg-pitch-accent/10 text-pitch-accent"
                                        : "border-white/10 bg-black/50 text-white hover:border-white/30 hover:bg-white/5"
                                )}
                            >
                                <span className="font-bold uppercase italic tracking-widest">{t.name}</span>
                                {selectedTransferTeamId === t.id && <Users className="w-4 h-4 ml-2 inline" />}
                            </button>
                        ))}
                        {teams.filter((t: any) => t.id !== transferTargetReg.currentTeamId).length === 0 && (
                            <div className="p-4 text-center text-gray-500 font-bold text-xs uppercase tracking-widest">No available teams to transfer to.</div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => {
                                setTransferModalOpen(false);
                                setSelectedTransferTeamId('');
                            }}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-xs transition-colors rounded border border-white/10"
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submitTransfer}
                            className={cn(
                                "flex-1 py-3 text-black font-black uppercase tracking-widest text-xs transition-colors rounded",
                                selectedTransferTeamId ? "bg-pitch-accent hover:bg-yellow-400" : "bg-white/20 opacity-50 cursor-not-allowed"
                            )}
                            disabled={processing || !selectedTransferTeamId}
                        >
                            {processing ? 'Assigning...' : 'Assign to Team'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);
}
