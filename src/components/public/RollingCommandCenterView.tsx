'use client';

import { useState, useEffect } from 'react';
import { 
    Copy, Plus, CheckCircle2, AlertTriangle, Users, DollarSign, 
    SwitchCamera, ArrowRight, Trophy, Zap, LayoutDashboard, 
    Calendar, List, ScrollText, MessageSquare, CheckCircle, 
    XCircle, Clock, Trash2, ShieldCheck, HeartPulse, User, ShieldAlert
} from 'lucide-react';
import { toggleAcceptingFreeAgents, draftFreeAgent } from '@/app/actions/draft-player';
import { DraftConfirmationModal } from './DraftConfirmationModal';
import { useRouter } from 'next/navigation';
import { calculateNextMatch, calculateProjectedMatches } from '@/lib/match-logic';
import { upsertAttendance, getAttendanceForMatch } from '@/app/actions/attendance';
import { getGameSuspensions } from '@/app/actions/suspensions';
import { leaveRollingTeam, disbandRollingTeam } from '@/app/actions/rolling-league-registration';
import { useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PitchSideConfirmModal } from './PitchSideConfirmModal';
import { StandingsTable, Match } from '@/components/admin/StandingsTable';
import { cn } from '@/lib/utils';
import { isLeagueLocked } from '@/lib/league-utils';
import { RollingMatchHistory } from './RollingMatchHistory';

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
    payment_collection_type?: 'stripe' | 'cash';
    cash_amount?: number | null;
    cash_fee_structure?: string | null;
    is_rolling?: boolean;
    start_time: string;
    location?: string;
    description?: string;
    lifecycle_status?: 'active' | 'paused' | 'completed';
    lifecycle_end_date?: string | null;
    skipped_dates?: string[];
    teams_config?: any[];
}

// Using Match interface from StandingsTable for consistency


interface Message {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    team_id: string;
    profiles: {
        full_name: string;
        avatar_url: string | null;
    };
}

interface RollingCommandCenterViewProps {
    team: Team;
    tournament: Tournament;
    roster: Player[];
    freeAgents: Player[];
    matches: Match[];
    teams: any[];
    initialMessages: Message[];
    tournamentUrlBase: string; // e.g., "https://pitchside.com/tournaments/123"
    isCaptain: boolean;
    currentUserId: string;
}

export function RollingCommandCenterView({ 
    team, 
    tournament, 
    roster, 
    freeAgents, 
    matches, 
    teams,
    initialMessages, 
    tournamentUrlBase, 
    isCaptain, 
    currentUserId 
}: RollingCommandCenterViewProps) {
    const router = useRouter();
    const supabase = createClient();
    const [copied, setCopied] = useState(false);
    const [isAcceptingAgents, setIsAcceptingAgents] = useState(team.accepting_free_agents);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [confirmDraftPlayer, setConfirmDraftPlayer] = useState<Player | null>(null);
    const [inviteLink, setInviteLink] = useState('');
    const [activeTab, setActiveTab] = useState<'dashboard' | 'game-day' | 'schedule' | 'standings' | 'rules' | 'chat'>('dashboard');
    const [attendance, setAttendance] = useState<any[]>([]);
    
    // Filter live matches sequentially hooked to this Captain's team ID (UUID)
    const myMatches = matches.filter(m => m.home_team_id === team.id || m.away_team_id === team.id);
    const sortedMatches = [...matches].sort((a, b) => {
        const dateA = new Date(a.start_time || '').getTime();
        const dateB = new Date(b.start_time || '').getTime();
        return dateA - dateB;
    });
    const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);
    const [isRsvping, setIsRsvping] = useState<string | null>(null);
    const [isLeaving, startLeavingTransition] = useTransition();
    const [activeHatch, setActiveHatch] = useState<'leave' | 'disband' | null>(null);
    const [suspendedUserIds, setSuspendedUserIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!tournament?.id) return;
        getGameSuspensions(tournament.id).then(data => {
            const suspended = new Set(data.map(s => s.user_id));
            setSuspendedUserIds(suspended);
        }).catch(err => console.error(err));
    }, [tournament?.id]);

    const isLocked = isLeagueLocked(tournament);

    // Chat State
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [newMessage, setNewMessage] = useState('');

    const matchDateResult = tournament.is_rolling 
        ? calculateNextMatch(tournament as any) 
        : { status: 'concluded' as const, date: null };

    useEffect(() => {
        if (activeTab === 'game-day' && matchDateResult.date) {
            const fetchAttendance = async () => {
                setIsFetchingAttendance(true);
                try {
                    const data = await getAttendanceForMatch(tournament.id, matchDateResult.date!.split('T')[0]);
                    setAttendance(data);
                } catch (error) {
                    console.error("Failed to fetch attendance:", error);
                } finally {
                    setIsFetchingAttendance(false);
                }
            };
            fetchAttendance();
        }
    }, [activeTab, tournament.id, matchDateResult.date]);

    const handleRsvp = async (status: 'committed' | 'out') => {
        if (!matchDateResult.date) return;
        setIsRsvping(status);
        try {
            await upsertAttendance(tournament.id, team.id, matchDateResult.date.split('T')[0], status);
            // Refresh attendance list
            const data = await getAttendanceForMatch(tournament.id, matchDateResult.date.split('T')[0]);
            setAttendance(data);
        } catch (error) {
            console.error("Failed to RSVP:", error);
        } finally {
            setIsRsvping(null);
        }
    };

    // Chat Subscription Logic with proper cleanup
    useEffect(() => {
        const channel = supabase
            .channel(`team-chat-${team.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `team_id=eq.${team.id}`
                },
                async (payload) => {
                    // Fetch full profile info for the new message
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newMsg: Message = {
                        ...(payload.new as any),
                        profiles: profile || { full_name: 'Unknown', avatar_url: null }
                    };

                    setMessages(prev => [...prev.filter(m => m.id !== newMsg.id), newMsg]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [team.id, supabase]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage.trim();
        setNewMessage('');

        const { error } = await supabase
            .from('messages')
            .insert({
                content,
                team_id: team.id,
                user_id: currentUserId
            });

        if (error) {
            console.error("Failed to send message:", error);
        }
    };

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
        } finally {
            setIsProcessing(null);
        }
    };

    const executeLeave = () => {
        startLeavingTransition(async () => {
            try {
                await leaveRollingTeam(tournament.id, team.id);
                setActiveHatch(null);
                router.push(`/games/${tournament.id}`);
            } catch (error) {
                console.error('Failed to leave team:', error);
                setActiveHatch(null);
            }
        });
    };

    const executeDisband = () => {
        startLeavingTransition(async () => {
            try {
                await disbandRollingTeam(team.id, tournament.id);
                setActiveHatch(null);
                router.push(`/games/${tournament.id}`);
            } catch (error) {
                console.error('Failed to disband team:', error);
                setActiveHatch(null);
            }
        });
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
                
                {isLocked && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 py-4 px-6 rounded-lg text-center font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                        <AlertTriangle className="w-5 h-5" /> Rosters Locked — Registration has closed
                    </div>
                )}

                {/* Header */}
                <div 
                    className="border-t-4 pt-8" 
                    style={{ borderColor: team.primary_color || '#cbff00' }}
                >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <p className="text-pitch-secondary text-xs font-black uppercase tracking-widest bg-white/5 py-1 px-3 rounded-full inline-block mb-3 border border-white/10">
                                {isCaptain ? "Captain's Command Center" : "Team Hub"}
                            </p>
                            <h1 className="font-heading text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-2">
                                {team.name}
                            </h1>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-pitch-accent" /> {tournament.name}
                            </p>
                        </div>

                        {/* Escape Hatches (Disband / Leave) */}
                        {!isLocked && (
                            <div className="flex gap-3 mt-4 md:mt-0">
                                {isCaptain ? (
                                    <button
                                        onClick={() => setActiveHatch('disband')}
                                        disabled={isLeaving}
                                        className="px-6 py-3 border border-red-500/30 text-red-500/70 hover:text-red-500 hover:border-red-500 hover:bg-red-500/5 transition-all font-black uppercase tracking-widest text-[10px] flex items-center gap-2 rounded-lg disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4" /> 
                                        {isLeaving ? 'Disbanding...' : 'Disband Team'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setActiveHatch('leave')}
                                        disabled={isLeaving}
                                        className="px-6 py-3 border border-red-500/30 text-red-500/70 hover:text-red-500 hover:border-red-500 hover:bg-red-500/5 transition-all font-black uppercase tracking-widest text-[10px] flex items-center gap-2 rounded-lg disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4" /> 
                                        {isLeaving ? 'Leaving...' : 'Leave Team'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* TAB NAVIGATION */}
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto hide-scrollbar sticky top-[72px] z-40 backdrop-blur-md">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        ...(tournament.is_rolling ? [{ id: 'game-day', label: 'Game Day Prep', icon: HeartPulse }] : []),
                        { id: 'schedule', label: 'Schedule', icon: Calendar },
                        { id: 'standings', label: 'Standings', icon: List },
                        { id: 'rules', label: 'Rules', icon: ScrollText },
                        { id: 'chat', label: 'Team Chat', icon: MessageSquare },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-lg whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-pitch-accent text-pitch-black shadow-lg shadow-pitch-accent/20'
                                    : 'text-pitch-secondary hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                    
                    {/* Left Column: Roster & Invites */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* SECTION A: Viral Invite Engine - CAPTAIN ONLY */}
                        {isCaptain && !isLocked && (
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
                        )}

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
                                                    <div className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                                        {player.profiles.full_name || 'Unknown Player'}
                                                        {suspendedUserIds.has(player.user_id) && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> SUSPENDED</span>}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1">
                                                        {player.preferred_positions?.join(', ') || 'No preference'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {player.status === 'paid' || player.status === 'confirmed' ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#ccff00] bg-[#ccff00]/10 px-2 py-1 rounded border border-[#ccff00]/20">
                                                        <CheckCircle2 className="w-3 h-3" /> Paid
                                                    </span>
                                                ) : player.status === 'registered' ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white bg-white/10 px-2 py-1 rounded border border-white/20">
                                                        <CheckCircle2 className="w-3 h-3" /> Registered
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
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
                        
                        {/* SECTION B: The Financial Tracker or Cash Block */}
                        {tournament.payment_collection_type === 'cash' ? (
                            <div className="bg-pitch-accent text-pitch-black rounded-2xl p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                                <div className="absolute -right-4 -top-4 opacity-10">
                                    <DollarSign className="w-32 h-32" />
                                </div>
                                <Zap className="w-12 h-12 mb-4 animate-pulse" />
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-2 opacity-70">Payment Mode</h3>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-6">Cash at Door</h2>
                                
                                <div className="w-full bg-black/10 p-6 rounded-xl border border-black/5 mb-6">
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Amount Required</p>
                                    <p className="text-5xl font-black italic tracking-tighter mb-1">${tournament.cash_amount || 0}</p>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">{tournament.cash_fee_structure || 'Per Selection'}</p>
                                </div>
                                
                                <p className="text-[10px] uppercase font-bold leading-relaxed tracking-widest px-4 opacity-80">
                                    No online payment required. Please settle directly with the facility upon arrival at the field.
                                </p>
                            </div>
                        ) : (
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
                        )}

                        {/* SECTION C: The Free Agent Draft Board - CAPTAIN ONLY */}
                        {isCaptain && !isLocked && (
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
                        )}
                    </div>
                </div>
            )}

                {/* GAME DAY PREP TAB */}
                {activeTab === 'game-day' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-pitch-card border border-white/5 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <HeartPulse className="w-24 h-24" />
                            </div>
                            
                            <div className="mb-8">
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Game Day Prep</h2>
                                <p className="text-pitch-secondary text-xs font-bold uppercase tracking-widest">RSVP & Match Commitment</p>
                            </div>

                            {matchDateResult.status === 'concluded' ? (
                                <div className="text-center py-12 bg-black/40 rounded-xl border border-white/5">
                                    <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-black uppercase italic text-gray-500">Season Concluded</h3>
                                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">Check back for the next season.</p>
                                </div>
                            ) : matchDateResult.status === 'paused' ? (
                                <div className="text-center py-12 bg-black/40 rounded-xl border border-orange-500/20">
                                    <AlertTriangle className="w-12 h-12 text-orange-500/50 mx-auto mb-4" />
                                    <h3 className="text-xl font-black uppercase italic text-orange-500/80">Season Paused</h3>
                                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">The admin has temporarily paused this league.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Date Highlight */}
                                    <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-white/5 rounded-xl border border-white/10">
                                        <div className="w-20 h-20 bg-pitch-accent text-pitch-black rounded-xl flex flex-col items-center justify-center shrink-0">
                                            <span className="text-[10px] font-black uppercase">{matchDateResult.date ? new Date(matchDateResult.date).toLocaleString('default', { month: 'short' }) : '---'}</span>
                                            <span className="text-3xl font-black tracking-tighter">{matchDateResult.date ? new Date(matchDateResult.date).getDate() : '--'}</span>
                                        </div>
                                        <div className="text-center md:text-left">
                                            <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                                                Next Match: {matchDateResult.date ? new Date(matchDateResult.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Calculating...'}
                                            </h3>
                                            <p className="text-pitch-secondary text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                                                {tournament.location || 'PitchSide Grounds'} • {new Date(tournament.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* PERSONAL RSVP SECTION */}
                                    <div className="bg-black/40 rounded-xl p-8 border border-white/5 text-center space-y-6">
                                        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-pitch-secondary">Your Status</h4>
                                        {suspendedUserIds.has(currentUserId) ? (
                                            <div className="bg-red-900/20 border border-red-500/50 text-red-500 py-6 px-6 rounded-lg font-black uppercase tracking-widest text-sm flex flex-col items-center justify-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                                <ShieldAlert className="w-8 h-8" />
                                                YOU ARE SUSPENDED FOR THIS MATCH
                                                <p className="text-[10px] text-red-500/80 mt-2">You cannot RSVP or play in this match.</p>
                                            </div>
                                        ) : (
                                            <div className="flex justify-center gap-4">
                                                <button
                                                    onClick={() => handleRsvp('committed')}
                                                    disabled={!!isRsvping}
                                                    className={`px-8 py-4 rounded-lg font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 ${
                                                        attendance.find(a => a.user_id === currentUserId)?.status === 'committed'
                                                        ? 'bg-green-500 text-pitch-black shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                    }`}
                                                >
                                                    {isRsvping === 'committed' ? '...' : <><CheckCircle className="w-4 h-4" /> I'm In</>}
                                                </button>
                                                <button
                                                    onClick={() => handleRsvp('out')}
                                                    disabled={!!isRsvping}
                                                    className={`px-8 py-4 rounded-lg font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 ${
                                                        attendance.find(a => a.user_id === currentUserId)?.status === 'out'
                                                        ? 'bg-red-500 text-pitch-black shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                    }`}
                                                >
                                                    {isRsvping === 'out' ? '...' : <><XCircle className="w-4 h-4" /> I'm Out</>}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* ROSTER RSVP LIST */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-pitch-secondary">Team Commitment</h4>
                                            <div className="flex gap-4">
                                                <span className="text-[10px] font-bold uppercase text-green-500">
                                                    {attendance.filter(a => a.status === 'committed').length} In
                                                </span>
                                                <span className="text-[10px] font-bold uppercase text-red-500">
                                                    {attendance.filter(a => a.status === 'out').length} Out
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {roster.map(player => {
                                                const playerAttendance = attendance.find(a => a.user_id === player.user_id);
                                                return (
                                                    <div key={player.id} className="flex items-center justify-between p-4 bg-black/50 rounded-xl border border-white/5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
                                                                {player.profiles.avatar_url ? (
                                                                    <img src={player.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Users className="w-5 h-5 text-gray-500" />
                                                                )}
                                                            </div>
                                                            <div className="font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                                                                {player.profiles.full_name || 'Anonymous'}
                                                                {suspendedUserIds.has(player.user_id) && <span className="text-[8px] bg-red-600 text-white px-1 py-0.5 rounded font-black tracking-widest flex items-center gap-0.5"><ShieldAlert className="w-2 h-2" /> SUSPENDED</span>}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            {playerAttendance?.status === 'committed' ? (
                                                                <span className="text-green-500"><CheckCircle className="w-4 h-4" /></span>
                                                            ) : playerAttendance?.status === 'out' ? (
                                                                <span className="text-red-500"><XCircle className="w-4 h-4" /></span>
                                                            ) : (
                                                                <span className="text-gray-600"><Clock className="w-4 h-4" /></span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* SCHEDULE TAB: Phase Shift Logic */}
                {activeTab === 'schedule' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* 1. Header & Seam Logic */}
                        <div className="flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-2">Match Schedule</h1>
                                <p className="text-pitch-secondary text-xs font-bold uppercase tracking-widest leading-relaxed">
                                    {myMatches.length > 0 ? 'Verified Match Schedule' : 'Automated Sequence Engine'}
                                </p>
                            </div>
                        </div>

                        {/* 2. Concrete Matches (From DB) */}
                        <div className="space-y-4">
                            {myMatches.length === 0 ? (
                                <div className="bg-[#171717] border border-dashed border-white/5 rounded-2xl p-16 text-center">
                                    <Calendar className="w-12 h-12 text-pitch-secondary mx-auto mb-6 opacity-20" />
                                    <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Schedule Pending</h4>
                                    <p className="text-xs text-pitch-secondary uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                                        Waiting for Commissioner to release the schedule.
                                    </p>
                                </div>
                            ) : (
                                myMatches.map((match, idx) => (
                                    <div key={match.id} className="bg-pitch-card border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center gap-8 relative group overflow-hidden">
                                    
                                    {/* Match Date Label */}
                                    <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/10 w-24 shrink-0">
                                        <span className="text-[10px] font-black uppercase text-pitch-secondary">
                                            {new Date(match.start_time || '').toLocaleString('default', { month: 'short' })}
                                        </span>
                                        <span className="text-3xl font-black italic tracking-tighter">
                                            {new Date(match.start_time || '').getDate()}
                                        </span>
                                    </div>

                                    {/* Opponents */}
                                    <div className="flex-1 flex items-center justify-between gap-4 w-full px-4">
                                        <div className="text-center md:text-left flex-1">
                                            <p className="text-[10px] font-black uppercase text-gray-500 mb-1 tracking-widest">{new Date(match.start_time || '').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                            <h3 className="font-heading text-xl md:text-2xl font-black uppercase italic truncate">
                                                {match.home_team_obj?.name || match.home_team || 'Home Team'}
                                            </h3>
                                        </div>
                                        <div className="bg-white/10 px-4 py-2 rounded font-black italic text-lg text-pitch-accent">
                                            {match.status === 'completed' ? `${match.home_score} - ${match.away_score}` : 'VS'}
                                        </div>
                                        <div className="text-center md:text-right flex-1">
                                            <p className="text-[10px] font-black uppercase text-gray-500 mb-1 tracking-widest">{new Date(match.start_time || '').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                                            <h3 className="font-heading text-xl md:text-2xl font-black uppercase italic truncate">
                                                {match.away_team_obj?.name || match.away_team || 'Away Team'}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="shrink-0 flex flex-col items-center md:items-end">
                                        <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                                            match.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-pitch-accent/10 text-pitch-accent border border-pitch-accent/20'
                                        }`}>
                                            {match.status}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-500 mt-2 uppercase">
                                            {match.field_name || 'Field 1'}
                                        </span>
                                    </div>
                                </div>
                            )))}

                            {/* 3. Autopilot Projections (The Phase Shift Seam) */}
                            {(() => {
                                const lastConcreteDate = myMatches.length > 0 ? myMatches[myMatches.length - 1].start_time : null;
                                const futureCount = Math.max(0, 8 - myMatches.length);
                                if (futureCount <= 0) return null;

                                const projections = calculateProjectedMatches(tournament as any, futureCount, lastConcreteDate);
                                
                                return projections.map((projDate, idx) => (
                                    <div key={`proj-${idx}`} className="bg-white/5 border border-white/5 border-dashed rounded-2xl p-6 opacity-60 flex flex-col md:flex-row items-center gap-8 group grayscale hover:grayscale-0 transition-all">
                                        <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/10 w-24 shrink-0">
                                            <span className="text-[10px] font-black uppercase text-gray-600">
                                                {new Date(projDate).toLocaleString('default', { month: 'short' })}
                                            </span>
                                            <span className="text-3xl font-black italic tracking-tighter text-gray-500">
                                                {new Date(projDate).getDate()}
                                            </span>
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <h3 className="text-lg font-black uppercase italic tracking-tight text-gray-500">Projected Match Window</h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mt-1">
                                                Autopilot Sequence • {new Date(projDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="shrink-0">
                                            <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-600">
                                                Virtual
                                            </span>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                )}

                {/* STANDINGS TAB: Traditional Points Table */}
                {activeTab === 'standings' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-2">League Standings</h1>
                                <p className="text-pitch-secondary text-xs font-bold uppercase tracking-widest">Points • GD • Goals For</p>
                            </div>
                        </div>

                        <div className="bg-pitch-card border border-white/5 rounded-2xl overflow-hidden shadow-2xl p-1">
                            {matches.length === 0 ? (
                                <div className="bg-[#171717] rounded-xl py-20 px-6 text-center border border-white/5">
                                    <Trophy className="w-12 h-12 text-pitch-secondary mx-auto mb-6 opacity-20" />
                                    <h3 className="text-xl font-black italic uppercase tracking-widest text-white mb-2">Standings Pending</h3>
                                    <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.2em] leading-relaxed max-w-md mx-auto">
                                        Waiting for Commissioner to release the schedule.
                                    </p>
                                </div>
                            ) : (
                                <StandingsTable 
                                    gameId={tournament.id}
                                    teams={teams}
                                    matches={matches}
                                    isPublicMode={true}
                                    highlightTeamId={team.id}
                                />
                            )}
                        </div>

                        {/* Historical Results Section */}
                        <RollingMatchHistory 
                            matches={matches}
                            teams={teams}
                            userTeamId={team.id}
                        />
                    </div>
                )}

                {/* RULES TAB: High-Contrast Markdown Rendering */}
                {activeTab === 'rules' && (
                    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-pitch-accent/20 to-transparent blur-2xl opacity-50 transition-opacity" />
                            <div className="bg-pitch-card border border-white/5 rounded-2xl p-8 md:p-12 shadow-2xl relative">
                                <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-8 border-b border-white/10 pb-4">
                                    Rules & Event Policy
                                </h1>
                                
                                {tournament.description ? (
                                    <div className="rules-content space-y-6 text-gray-300 leading-relaxed font-medium">
                                        {/* Simple Sanitized Multi-line Renderer for MVP stability */}
                                        {tournament.description.split('\n').map((line: string, i: number) => {
                                            if (!line.trim()) return <br key={i} />;
                                            
                                            // Basic support for markdown-style headers and lists
                                            if (line.startsWith('# ')) return <h2 key={i} className="text-2xl font-black uppercase italic text-white mt-8 mb-4 border-l-4 border-pitch-accent pl-4">{line.replace('# ', '')}</h2>;
                                            if (line.startsWith('## ')) return <h3 key={i} className="text-lg font-black uppercase text-pitch-accent mt-6 mb-3">{line.replace('## ', '')}</h3>;
                                            if (line.startsWith('- ')) return <div key={i} className="flex gap-4 items-start ml-2 text-sm"><div className="w-1.5 h-1.5 bg-pitch-accent rounded-full mt-2 shrink-0" /><span>{line.replace('- ', '')}</span></div>;
                                            
                                            return (
                                                <p key={i} className="text-gray-400 text-sm whitespace-pre-wrap">
                                                    {line.split('**').map((part: string, index: number) => (
                                                        index % 2 === 1 ? <strong key={index} className="text-white font-black">{part}</strong> : part
                                                    ))}
                                                </p>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-24 text-gray-600">
                                        <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="font-bold uppercase text-[10px] tracking-[0.3em]">No custom rules defined for this event</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CHAT TAB: Realtime Team Security */}
                {activeTab === 'chat' && (
                    <div className="max-w-4xl mx-auto h-[70vh] flex flex-col bg-pitch-card border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        {/* Chat Header */}
                        <div className="p-6 bg-white/5 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-pitch-accent/10 rounded-lg">
                                    <MessageSquare className="w-5 h-5 text-pitch-accent" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Team Strategy Hub</h3>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Locked to {team.name}</p>
                                </div>
                            </div>
                            <div className="flex -space-x-2">
                                {roster.slice(0, 5).map(p => (
                                    <div key={p.id} className="w-8 h-8 rounded-full border-2 border-pitch-card bg-white/10 overflow-hidden flex items-center justify-center">
                                        {p.profiles.avatar_url ? (
                                            <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4 text-pitch-accent" />
                                        )}
                                    </div>
                                ))}
                                {roster.length > 5 && (
                                    <div className="w-8 h-8 rounded-full border-2 border-pitch-card bg-pitch-accent text-pitch-black flex items-center justify-center text-[10px] font-black">
                                        +{roster.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Message Feed */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center px-12 opacity-30">
                                    <Zap className="w-12 h-12 mb-4" />
                                    <p className="font-bold uppercase tracking-[0.2em] text-xs">No chatter yet. Sound off to the squad!</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div key={msg.id} className={`flex gap-4 ${msg.user_id === currentUserId ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10 shrink-0">
                                            <img src={msg.profiles?.avatar_url || ''} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className={`max-w-[70%] space-y-1 ${msg.user_id === currentUserId ? 'items-end' : ''}`}>
                                            <div className="flex items-center gap-2 group">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-pitch-accent transition-colors">
                                                    {msg.profiles?.full_name}
                                                </span>
                                                <span className="text-[8px] font-bold text-gray-600 uppercase">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                                                msg.user_id === currentUserId 
                                                ? 'bg-pitch-accent text-pitch-black font-medium rounded-tr-none' 
                                                : 'bg-white/5 border border-white/10 text-white rounded-tl-none'
                                            }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-6 bg-black/40 border-t border-white/5 shrink-0">
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="w-full bg-pitch-black border border-white/10 rounded-xl px-6 py-4 pr-32 text-sm focus:outline-none focus:border-pitch-accent/50 focus:ring-1 focus:ring-pitch-accent/20 transition-all placeholder:text-gray-600 font-medium"
                                />
                                <button 
                                    type="submit"
                                    className="absolute right-2 top-2 bottom-2 px-6 bg-pitch-accent text-pitch-black rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all transform active:scale-95 shadow-lg shadow-pitch-accent/20"
                                >
                                    Transmit
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Branded Escape Hatch Confirmations */}
            <PitchSideConfirmModal
                isOpen={activeHatch === 'leave'}
                onClose={() => setActiveHatch(null)}
                onConfirm={executeLeave}
                isProcessing={isLeaving}
                isDestructive={true}
                title="Leave Team"
                confirmText="Confirm & Leave"
                description={
                    <div className="space-y-4">
                        <p>Are you sure you want to leave <span className="text-white font-bold">{team.name}</span>?</p>
                        <p className="bg-white/5 border border-white/10 p-4 rounded-xl text-xs leading-relaxed italic">
                            You will be returned to the <span className="text-pitch-accent font-black">Free Agent pool</span> for this league and may be drafted by another captain.
                        </p>
                    </div>
                }
            />

            <PitchSideConfirmModal
                isOpen={activeHatch === 'disband'}
                onClose={() => setActiveHatch(null)}
                onConfirm={executeDisband}
                isProcessing={isLeaving}
                isDestructive={true}
                title="Disband Team"
                confirmText="Confirm Disband"
                description={
                    <div className="space-y-4">
                        <p className="text-red-400 font-bold">WARNING: CRITICAL ACTION</p>
                        <p>Are you sure you want to disband <span className="text-white font-bold">{team.name}</span>?</p>
                        <p className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs leading-relaxed italic text-red-400">
                            This will release all rostered players back into the Free Agent pool and cancel the team registration. historical transaction data will be preserved for audits, but the team will no longer compete.
                        </p>
                    </div>
                }
            />

            <DraftConfirmationModal 
                isOpen={!!confirmDraftPlayer}
                onClose={() => setConfirmDraftPlayer(null)}
                onConfirm={handleExecuteDraft}
                player={confirmDraftPlayer}
                isProcessing={!!isProcessing}
            />
        </div>
    );
}
