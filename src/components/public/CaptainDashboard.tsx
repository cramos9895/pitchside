'use client';

import { useState, useEffect } from 'react';
import { Copy, Plus, CheckCircle2, AlertTriangle, Users, DollarSign, SwitchCamera, ArrowRight, Trophy } from 'lucide-react';
import { toggleAcceptingFreeAgents, draftFreeAgent } from '@/app/actions/draft-player';
import { DraftConfirmationModal } from './DraftConfirmationModal';
import { useRouter } from 'next/navigation';

interface Player {
    id: string;
    user_id: string;
    status: string;
    preferred_positions: string[] | null;
    profiles: {
        full_name: string;
        avatar_url: string | null;
    };
    // Placeholder for actual payment tracking if implemented.
    // For this UI, we will assume everyone owes an equal share if unpaid
    has_paid?: boolean; 
}

interface Team {
    id: string;
    name: string;
    primary_color: string | null;
    accepting_free_agents: boolean;
}

interface Tournament {
    id: string;
    name: string;
    price_per_team: number | null;
    deposit_amount?: number | null;
    has_registration_fee_credit?: boolean;
    free_agent_fee?: number | null;
}

interface CaptainDashboardProps {
    team: Team;
    tournament: Tournament;
    roster: Player[];
    freeAgents: Player[];
    tournamentUrlBase: string; // e.g., "https://pitchside.com/tournaments/123"
}

export function CaptainDashboard({ team, tournament, roster, freeAgents, tournamentUrlBase }: CaptainDashboardProps) {
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const [isAcceptingAgents, setIsAcceptingAgents] = useState(team.accepting_free_agents);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [confirmDraftPlayer, setConfirmDraftPlayer] = useState<Player | null>(null);
    const [inviteLink, setInviteLink] = useState('');

    useEffect(() => {
        setInviteLink(`${window.location.origin}/invite/${team.id}`);
    }, [team.id]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleToggleFreeAgents = async () => {
        const newValue = !isAcceptingAgents;
        setIsAcceptingAgents(newValue);
        try {
            await toggleAcceptingFreeAgents(team.id, newValue);
        } catch (error) {
            console.error('Failed to toggle:', error);
            setIsAcceptingAgents(!newValue); // revert on failure
        }
    };

    const triggerDraftDraftConfirmation = (player: Player) => {
        setConfirmDraftPlayer(player);
    };

    const handleExecuteDraft = async () => {
        if (!confirmDraftPlayer) return;
        
        setIsProcessing(confirmDraftPlayer.id);
        try {
            await draftFreeAgent(confirmDraftPlayer.id, team.id);
            setConfirmDraftPlayer(null);
            router.refresh(); // Forces server component refresh
        } catch (error: any) {
            console.error('Failed to draft player:', error);
            // In a real app, we might use a toast here. For now, we'll keep it clean.
        } finally {
            setIsProcessing(null);
        }
    };

    // Financial calculations
    const FREE_AGENT_FEE = tournament.free_agent_fee || 50; // Use database value or fallback
    const draftedCount = roster.filter(p => p.status === 'drafted').length;
    const faCredit = draftedCount * FREE_AGENT_FEE;
    
    const getPaidCount = () => roster.filter(p => p.has_paid).length;
    let paidAmount = getPaidCount() * 50; // Mock math: Assuming $50/player payment chunk for demo
    
    // Automatically credit the captain's deposit if the creator settings mandated it
    if (tournament.has_registration_fee_credit) {
        paidAmount += (tournament.deposit_amount || 50);
    }

    const teamFee = tournament.price_per_team || 500;
    const remainingBalance = Math.max(0, teamFee - paidAmount - faCredit);
    const progressPercent = Math.min(100, ((paidAmount + faCredit) / teamFee) * 100);

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pt-32 px-4 pb-24">
            <div className="max-w-5xl mx-auto space-y-12">
                
                {/* Header */}
                <div 
                    className="border-t-4 pt-8" 
                    style={{ borderColor: team.primary_color || '#cbff00' }}
                >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <p className="text-pitch-secondary text-xs font-black uppercase tracking-widest bg-white/5 py-1 px-3 rounded-full inline-block mb-3 border border-white/10">
                                Captain's Command Center
                            </p>
                            <h1 className="font-heading text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-2">
                                {team.name}
                            </h1>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-pitch-accent" /> {tournament.name}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Roster & Invites */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* SECTION A: Viral Invite Engine */}
                        <div className="bg-pitch-card border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-pitch-accent/5 to-transparent pointer-events-none" />
                            <h2 className="text-xl font-black uppercase italic tracking-widest mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-pitch-accent" /> Draft Your Squad
                            </h2>
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                Share this private link in your group chats to let players register, sign their waivers, and automatically join your roster.
                            </p>
                            <button
                                onClick={handleCopy}
                                className={`w-full py-5 rounded-lg flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] transition-all transform active:scale-[0.98] ${
                                    copied 
                                    ? 'bg-green-500 text-pitch-black shadow-[0_0_30px_rgba(34,197,94,0.3)]' 
                                    : 'bg-pitch-accent text-pitch-black hover:bg-white shadow-[0_0_30px_rgba(204,255,0,0.15)]'
                                }`}
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle2 className="w-6 h-6" /> Link Copied to Clipboard!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-6 h-6" /> Copy Tournament Invite Link
                                    </>
                                )}
                            </button>
                        </div>

                        {/* SECTION A: The Roster List */}
                        <div className="bg-pitch-card border border-white/5 rounded-2xl p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black uppercase italic tracking-widest flex items-center gap-2">
                                    Current Roster
                                </h2>
                                <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-pitch-accent">
                                    {roster.length} Players
                                </span>
                            </div>
                            
                            <div className="space-y-3">
                                {roster.length === 0 ? (
                                    <div className="text-center py-12 bg-black/50 rounded-xl border border-dashed border-white/10">
                                        <Users className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">No players drafted yet</p>
                                    </div>
                                ) : (
                                    roster.map(player => (
                                        <div key={player.id} className="flex items-center justify-between p-4 bg-black/50 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
                                                    {player.profiles.avatar_url ? (
                                                        <img src={player.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users className="w-5 h-5 text-gray-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold uppercase tracking-wider text-sm">
                                                        {player.profiles.full_name || 'Unknown Player'}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1">
                                                        {player.preferred_positions?.join(', ') || 'No preference'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {player.has_paid ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-2 py-1 rounded">
                                                        <CheckCircle2 className="w-3 h-3" /> Paid
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2 py-1 rounded">
                                                        <AlertTriangle className="w-3 h-3" /> Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Finances & Free Agents */}
                    <div className="space-y-8">
                        
                        {/* SECTION B: The Financial Tracker */}
                        <div className="bg-pitch-card border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                            <h2 className="text-xl font-black uppercase italic tracking-widest mb-6 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-400" /> Financial Tracker
                            </h2>
                            
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Team Fee</span>
                                    <span className="text-xl font-black">${teamFee}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        Amount Paid
                                        {tournament.has_registration_fee_credit && (
                                            <span className="bg-green-500/10 text-green-500 text-[8px] px-1.5 py-0.5 rounded border border-green-500/20">
                                                INCLUDES DEPOSIT
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-xl font-black text-green-400">-${paidAmount}</span>
                                </div>
                                {faCredit > 0 && (
                                    <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                            Free Agent Credits
                                            <span className="bg-pitch-accent/10 text-pitch-accent text-[8px] px-1.5 py-0.5 rounded border border-pitch-accent/20">
                                                {draftedCount} PLAYERS
                                            </span>
                                        </span>
                                        <span className="text-xl font-black text-pitch-accent">-${faCredit}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-pitch-accent text-sm font-black uppercase tracking-widest">Balance</span>
                                    <span className="text-3xl font-black text-white">${remainingBalance}</span>
                                </div>
                            </div>
                            
                            {/* Visual Progress Bar */}
                            <div className="mb-8">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                    <span>{progressPercent.toFixed(0)}% Funded</span>
                                    <span>Deadline: Friday</span>
                                </div>
                                <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-white/10 p-0.5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-pitch-accent to-green-400 rounded-full transition-all duration-1000 ease-out relative"
                                        style={{ width: `${progressPercent}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 w-full animate-pulse blur-[2px]" />
                                    </div>
                                </div>
                            </div>

                            {remainingBalance > 0 && (
                                <button className="w-full py-4 border border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:border-green-400 font-black uppercase tracking-widest text-xs rounded-lg transition-all flex items-center justify-center gap-2">
                                    Settle Remaining Balance <ArrowRight className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* SECTION C: The Free Agent Draft Board */}
                        <div className="bg-pitch-card border border-white/5 rounded-2xl p-6 shadow-2xl">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-xl font-black uppercase italic tracking-widest flex items-center gap-2 mb-1">
                                        Free Agent Draft
                                    </h2>
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Scout available players</p>
                                </div>
                                
                                {/* Toggle Switch */}
                                <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only" 
                                            checked={isAcceptingAgents}
                                            onChange={handleToggleFreeAgents}
                                        />
                                        <div className={`block w-12 h-6 rounded-full transition-colors ${isAcceptingAgents ? 'bg-pitch-accent' : 'bg-white/20'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-black w-4 h-4 rounded-full transition-transform ${isAcceptingAgents ? 'transform translate-x-6' : ''}`}></div>
                                    </div>
                                </label>
                            </div>

                            {!isAcceptingAgents ? (
                                <div className="text-center py-8 bg-black/50 rounded-xl border border-dashed border-white/10">
                                    <SwitchCamera className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest leading-relaxed px-4">
                                        Toggle 'Accepting Free Agents' to signal to the community you need players.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {freeAgents.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">No Free Agents Available</p>
                                        </div>
                                    ) : (
                                        freeAgents.map(agent => (
                                            <div key={agent.id} className="p-3 bg-black/50 rounded-xl border border-white/5 hover:border-pitch-accent/30 transition-colors flex flex-col gap-3 group">
                                                <div className="flex gap-3 items-center">
                                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                        {agent.profiles.avatar_url ? (
                                                            <img src={agent.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Users className="w-4 h-4 text-gray-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold uppercase tracking-wider text-xs truncate">
                                                            {agent.profiles.full_name || 'Free Agent'}
                                                        </div>
                                                        <div className="flex gap-1 flex-wrap mt-1">
                                                            {agent.preferred_positions?.map(pos => (
                                                                <span key={pos} className="bg-pitch-accent/10 border border-pitch-accent/20 text-pitch-accent text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                                                                    {pos.substring(0, 3)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => triggerDraftDraftConfirmation(agent)}
                                                    disabled={isProcessing === agent.id}
                                                    className="w-full py-2 bg-white/5 hover:bg-pitch-accent hover:text-pitch-black text-gray-300 font-black uppercase tracking-widest text-[10px] rounded transition-all flex justify-center items-center gap-1 disabled:opacity-50"
                                                >
                                                    {isProcessing === agent.id ? 'Drafting...' : <><Plus className="w-3 h-3" /> Draft Player</>}
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <DraftConfirmationModal 
                isOpen={!!confirmDraftPlayer}
                onClose={() => setConfirmDraftPlayer(null)}
                onConfirm={handleExecuteDraft}
                player={confirmDraftPlayer}
                isProcessing={isProcessing === confirmDraftPlayer?.id}
            />
        </div>
    );
}
