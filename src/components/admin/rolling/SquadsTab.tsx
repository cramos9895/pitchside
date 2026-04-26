import { useState } from 'react';
import { Users, UserPlus, FilePlus2, RefreshCw, Handshake, ShieldAlert, Settings2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createManualTeam, updateTeamDetails, transferPlayer, draftAutoTeam, searchProfiles, addManualPlayer, moveToFreeAgency, removeFromLeague, issuePermanentBan, issueSoftBan } from '@/app/actions/rolling-god-mode';
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

    // Advanced Player Management States
    const [addPlayerTeamId, setAddPlayerTeamId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [settingsTarget, setSettingsTarget] = useState<{ id: string, currentTeamId: string | null, userId: string, isCaptain: boolean } | null>(null);


    // Filter Free Agents
    
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await searchProfiles(query);
            setSearchResults(res.profiles);
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddManualPlayer = async (userId: string) => {
        if (!addPlayerTeamId) return;
        setProcessing(true);
        try {
            await addManualPlayer(gameId, addPlayerTeamId, userId);
            success("Player added successfully.");
            setAddPlayerTeamId(null);
            setSearchQuery('');
            setSearchResults([]);
            onRefresh();
        } catch (err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleAction = async (actionFn: () => Promise<any>, successMsg: string) => {
        if (!confirm('Are you sure you want to perform this action?')) return;
        setProcessing(true);
        try {
            await actionFn();
            success(successMsg);
            setSettingsTarget(null);
            onRefresh();
        } catch(err: any) {
            error(err.message);
        } finally {
            setProcessing(false);
        }
    };

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
                            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                                <h4 className="text-white font-black italic uppercase tracking-wider text-lg">
                                    {team.name}
                                </h4>
                                <button
                                    onClick={() => setAddPlayerTeamId(team.id)}
                                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                                >
                                    <UserPlus className="w-4 h-4" />
                                </button>
                            </div>
                            <table className="w-full text-left">
                                <tbody>
                                    {roster.map((p: any) => (
                                        <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 group">
                                            <td className="py-2 px-2 text-sm text-white font-bold uppercase">
                                                {p.profiles?.full_name}
                                                {team.captain_id === p.user_id && <span className="ml-2 px-1.5 py-0.5 bg-pitch-accent text-black text-[9px] rounded-sm tracking-widest font-black uppercase">C</span>}
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                                <button 
                                                    onClick={() => setSettingsTarget({ id: p.id, currentTeamId: team.id, userId: p.user_id, isCaptain: team.captain_id === p.user_id })}
                                                    className="invisible group-hover:visible p-1 hover:text-white transition-colors text-gray-500"
                                                >
                                                    <Settings2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {roster.length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="py-4 text-center text-[10px] text-gray-500 font-bold uppercase">Empty Roster</td>
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
                                onClick={() => setSettingsTarget({ id: f.id, currentTeamId: null, userId: f.user_id, isCaptain: false })}
                                className="mt-2 w-full py-1 text-[9px] bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-white transition-colors"
                            >
                                <Settings2 className="w-3 h-3" /> Manage
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* MODALS */}

        {/* ADD MANUAL PLAYER MODAL */}
        {addPlayerTeamId && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-pitch-card border border-white/10 w-full max-w-md p-6 rounded-lg shadow-2xl relative">
                    <h2 className="font-heading text-2xl font-black italic text-white uppercase mb-4 tracking-tighter flex items-center gap-2">
                        <UserPlus className="text-pitch-accent w-6 h-6" /> Add Player
                    </h2>
                    
                    <div className="relative mb-4">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search existing users by name or email..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-black border border-white/10 pl-10 pr-4 py-3 text-white uppercase font-bold text-sm focus:outline-none focus:border-pitch-accent transition-colors"
                            autoFocus
                        />
                    </div>
                    
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 mb-6">
                        {isSearching && <div className="text-gray-500 text-xs font-bold uppercase tracking-widest text-center py-4">Searching...</div>}
                        {!isSearching && searchResults.map(u => (
                            <div key={u.id} className="flex items-center justify-between bg-black/50 border border-white/5 p-3 hover:border-white/20 transition-colors">
                                <div>
                                    <div className="text-sm font-bold text-white uppercase">{u.full_name}</div>
                                    <div className="text-[10px] font-black tracking-widest text-gray-500 uppercase">{u.email}</div>
                                </div>
                                <button
                                    onClick={() => handleAddManualPlayer(u.id)}
                                    disabled={processing}
                                    className="px-3 py-1 bg-white/10 hover:bg-pitch-accent hover:text-black text-white font-black uppercase tracking-widest text-[10px] transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => { setAddPlayerTeamId(null); setSearchQuery(''); setSearchResults([]); }}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-xs transition-colors rounded border border-white/10"
                        disabled={processing}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )}

        {/* PLAYER SETTINGS MODAL */}
        {settingsTarget && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-pitch-card border border-white/10 w-full max-w-sm p-6 rounded-lg shadow-2xl relative">
                    <h2 className="font-heading text-2xl font-black italic text-white uppercase mb-6 tracking-tighter flex items-center gap-2">
                        <Settings2 className="text-pitch-accent w-6 h-6" /> Player Options
                    </h2>
                    
                    <div className="space-y-3 mb-6">
                        <button
                            onClick={() => {
                                setTransferTargetReg({ id: settingsTarget.id, currentTeamId: settingsTarget.currentTeamId });
                                setSettingsTarget(null);
                                setTransferModalOpen(true);
                            }}
                            className="w-full text-left p-4 bg-black/50 border border-white/10 hover:border-white/30 text-white font-bold uppercase text-xs tracking-widest transition-colors flex justify-between items-center"
                        >
                            Transfer to another Squad <RefreshCw className="w-4 h-4 text-gray-500" />
                        </button>

                        {settingsTarget.currentTeamId && !settingsTarget.isCaptain && (
                            <button
                                onClick={() => handleAction(() => updateTeamDetails(settingsTarget.currentTeamId!, gameId, { captain_id: settingsTarget.userId }), "Assigned as Captain")}
                                className="w-full text-left p-4 bg-pitch-accent/10 border border-pitch-accent/30 hover:border-pitch-accent text-pitch-accent font-bold uppercase text-xs tracking-widest transition-colors flex justify-between items-center"
                            >
                                Assign as Captain
                            </button>
                        )}

                        {settingsTarget.currentTeamId && settingsTarget.isCaptain && (
                            <button
                                onClick={() => handleAction(() => updateTeamDetails(settingsTarget.currentTeamId!, gameId, { captain_id: null }), "Unassigned as Captain")}
                                className="w-full text-left p-4 bg-gray-500/10 border border-gray-500/30 hover:border-gray-500 text-gray-400 font-bold uppercase text-xs tracking-widest transition-colors flex justify-between items-center"
                            >
                                Unassign as Captain
                            </button>
                        )}
                        
                        {settingsTarget.currentTeamId && (
                            <button
                                onClick={() => handleAction(() => moveToFreeAgency(settingsTarget.id, gameId), "Moved to Free Agency")}
                                className="w-full text-left p-4 bg-black/50 border border-white/10 hover:border-white/30 text-white font-bold uppercase text-xs tracking-widest transition-colors flex justify-between items-center"
                            >
                                Move to Free Agency <Handshake className="w-4 h-4 text-gray-500" />
                            </button>
                        )}
                        
                        <button
                            onClick={() => handleAction(() => removeFromLeague(settingsTarget.id, gameId), "Removed from League")}
                            className="w-full text-left p-4 bg-black/50 border border-red-500/30 hover:border-red-500 text-red-500 font-bold uppercase text-xs tracking-widest transition-colors flex justify-between items-center"
                        >
                            Remove from League <Users className="w-4 h-4 opacity-50" />
                        </button>
                        
                        {settingsTarget.currentTeamId && (
                            <>
                                <button
                                    onClick={() => handleAction(() => issueSoftBan(settingsTarget.userId, settingsTarget.currentTeamId!, gameId, 1), "Issued 1 Game Suspension")}
                                    className="w-full text-left p-4 bg-orange-500/10 border border-orange-500/30 hover:border-orange-500 text-orange-500 font-bold uppercase text-xs tracking-widest transition-colors flex justify-between items-center"
                                >
                                    Issue 1-Game Suspension <ShieldAlert className="w-4 h-4 opacity-50" />
                                </button>
                                
                                <button
                                    onClick={() => handleAction(() => issueSoftBan(settingsTarget.userId, settingsTarget.currentTeamId!, gameId, 2), "Issued 2 Game Suspension")}
                                    className="w-full text-left p-4 bg-orange-500/10 border border-orange-500/30 hover:border-orange-500 text-orange-500 font-bold uppercase text-xs tracking-widest transition-colors flex justify-between items-center"
                                >
                                    Issue 2-Game Suspension <ShieldAlert className="w-4 h-4 opacity-50" />
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => handleAction(() => issuePermanentBan(settingsTarget.id, gameId), "Permanently Banned from League")}
                            className="w-full text-left p-4 bg-red-900/20 border border-red-500/50 hover:bg-red-900/50 text-red-500 font-black uppercase text-xs tracking-widest transition-colors flex justify-between items-center"
                        >
                            Permanent League Ban <ShieldAlert className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setSettingsTarget(null)}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-xs transition-colors rounded border border-white/10"
                        disabled={processing}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )}

        
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
