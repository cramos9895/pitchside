'use client';

import { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, MapPin, MessageSquare, Shield, Clock, Timer, CheckCircle2, Wallet, Info, FileText, LogOut, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandingsTable, Match } from '@/components/admin/StandingsTable';
import { ChatInterface } from '@/components/ChatInterface';
import { leaveTournament } from '@/app/actions/tournament-registration';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { LeaveConfirmationModal } from './LeaveConfirmationModal';

interface PlayerCommandCenterProps {
    user: any;
    registration: any;
    game: any;
    roster: any[];
    matches: Match[];
    teams: any[];
}

export function PlayerCommandCenter({ user, registration, game, roster, matches, teams }: PlayerCommandCenterProps) {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'hub' | 'standings' | 'schedule' | 'rules' | 'chat'>('hub');
    const [isLeaving, setIsLeaving] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    
    const router = useRouter();
    const { success, error: toastError } = useToast();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLeaveTournament = async () => {
        setIsLeaving(true);
        try {
            const res = await leaveTournament(registration.id, game.id);
            if (res.success) {
                success("You have successfully left the tournament.");
                router.push('/dashboard');
            }
        } catch (err: any) {
            toastError(err.message || "Failed to leave tournament.");
            setIsLeaving(false);
            setShowLeaveModal(false);
        }
    };

    const isRostered = !!registration.team_id;
    const teamName = registration.team?.name || 'Free Agent';
    const teamId = registration.team_id;
    const locationName = game.location_nickname || game.facilities?.name || 'Unknown Venue';

    // Filter matches for the user's team using UUID for accuracy
    const teamMatches = matches.filter(m => m.home_team_id === teamId || m.away_team_id === teamId);
    
    // Sort matches by upcoming
    const nextMatch = teamMatches.find(m => m.status === 'scheduled' || m.status === 'active');

    // Split Pay calculation
    const teamSize = roster.length;
    const basePrice = game.team_price || 0;
    const currentShare = teamSize > 0 ? basePrice / teamSize : basePrice;
    const chargeDate = new Date(game.start_time);
    chargeDate.setHours(chargeDate.getHours() - 24); // Assuming 24h before kick

    return (
        <div className="min-h-screen bg-pitch-black text-white pt-2 p-4 md:p-6 pb-20">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-pitch-secondary uppercase font-black text-[10px] tracking-[0.2em]">
                            <Trophy className="w-3.5 h-3.5" /> Tournament Workspace
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                            {game.title}
                        </h1>
                        <div className="flex items-center gap-4 text-xs font-bold uppercase">
                            <span className="flex items-center gap-1.5 text-pitch-accent">
                                <Shield className="w-3.5 h-3.5" /> {teamName}
                            </span>
                            <span className="text-white/40">|</span>
                            <span className="flex items-center gap-1.5 text-white/60">
                                <MapPin className="w-3.5 h-3.5" /> {locationName}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <button
                            onClick={() => setShowLeaveModal(true)}
                            disabled={isLeaving}
                            className="flex items-center gap-2 px-3 py-1.5 border border-red-500/30 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded uppercase font-black text-[9px] tracking-widest transition-all disabled:opacity-50"
                        >
                            <LogOut className="w-3 h-3" />
                            Leave Tournament
                        </button>

                        {!isRostered && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-sm flex items-center gap-3 animate-pulse">
                                <div className="bg-yellow-500 p-1.5 rounded-full">
                                    <Clock className="w-4 h-4 text-black" />
                                </div>
                                <div>
                                    <p className="text-yellow-500 font-black uppercase text-[9px] tracking-wider">Draft Status</p>
                                    <p className="text-white font-bold text-xs">Waiting in Draft Pool</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub-Navigation (Only if Rostered) */}
                {isRostered && (
                    <div className="flex border-b border-white/5 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'hub', label: 'Command Center', icon: Shield },
                            { id: 'standings', label: 'Standings', icon: Trophy },
                            { id: 'schedule', label: 'Schedule', icon: Calendar },
                            { id: 'rules', label: 'Rules & Info', icon: FileText },
                            { id: 'chat', label: 'Team Chat', icon: MessageSquare },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "px-4 py-3 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap border-b-2",
                                    activeTab === tab.id 
                                        ? "border-pitch-accent text-pitch-accent" 
                                        : "border-transparent text-white/40 hover:text-white"
                                )}
                            >
                                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="space-y-6">
                    
                    {/* HUB TAB - Unified Dashboard */}
                    {(activeTab === 'hub' || !isRostered) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            
                            {/* Left Column: Team & Status */}
                            <div className="md:col-span-2 space-y-8">
                                
                                {/* Status Banner for FA */}
                                {!isRostered && (
                                    <div className="bg-white/5 border border-white/10 p-8 rounded-sm space-y-4">
                                        <h3 className="text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                                            <span className="text-4xl">⏳</span> The Draft Pool
                                        </h3>
                                        <p className="text-pitch-secondary leading-relaxed">
                                            You are officially registered and secured for <span className="text-white font-bold">{game.title}</span>. 
                                            Currently, you are in the player pool. An admin or team captain will draft you into a squad shortly.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                            <div className="bg-black/40 p-4 rounded-sm border border-white/5">
                                                <p className="text-[10px] font-black uppercase text-pitch-secondary mb-1">Date</p>
                                                <p className="font-bold text-sm">{new Date(game.start_time).toLocaleDateString()}</p>
                                            </div>
                                            <div className="bg-black/40 p-4 rounded-sm border border-white/5">
                                                <p className="text-[10px] font-black uppercase text-pitch-secondary mb-1">Check-in Time</p>
                                                <p className="font-bold text-sm">30 Mins Before Kickoff</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Next Match Card (If Rostered) */}
                                {isRostered && nextMatch && (
                                    <div className="bg-pitch-accent p-1 rounded-sm">
                                        <div className="bg-black px-6 py-8 rounded-[1px] space-y-6">
                                            <div className="flex justify-between items-center">
                                                <span className="bg-pitch-accent text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">Next Match</span>
                                                <span className="text-white/40 text-xs font-mono">{nextMatch.field_name}</span>
                                            </div>
                                            
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1 text-right">
                                                    <p className={cn("text-xl md:text-2xl font-black uppercase italic tracking-tighter", nextMatch.home_team_id === teamId && "text-pitch-accent")}>
                                                        {nextMatch.home_team_name || 'Home Team'}
                                                    </p>
                                                </div>
                                                <div className="text-center bg-white/10 px-4 py-2 rounded italic font-black text-xl">VS</div>
                                                <div className="flex-1 text-left">
                                                    <p className={cn("text-xl md:text-2xl font-black uppercase italic tracking-tighter", nextMatch.away_team_id === teamId && "text-pitch-accent")}>
                                                        {nextMatch.away_team_name || 'Away Team'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/10">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-5 h-5 text-pitch-accent" />
                                                    <span className="text-lg font-black">{new Date(nextMatch.start_time || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Timer className="w-5 h-5 text-pitch-accent" />
                                                    <span className="text-lg font-black">{game.half_length * 2} MINS</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isRostered && matches.length === 0 && (
                                    <div className="bg-[#171717] border border-dashed border-white/5 p-12 text-center rounded-2xl">
                                        <Calendar className="w-12 h-12 text-pitch-secondary mx-auto mb-4 opacity-20" />
                                        <h4 className="text-lg font-black italic uppercase tracking-widest text-white mb-2">Schedule Pending</h4>
                                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] leading-relaxed max-w-xs mx-auto">
                                            Waiting for Commissioner to release the schedule.
                                        </p>
                                    </div>
                                )}

                                {/* Team Roster (If Rostered) */}
                                {isRostered && (
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
                                            <Users className="w-6 h-6 text-pitch-accent" /> Team Roster
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {roster.map((player) => {
                                                const isMe = player.user_id === user.id;
                                                return (
                                                    <div key={player.id} className={cn(
                                                        "bg-white/5 border p-4 rounded-sm flex items-center justify-between transition-all",
                                                        isMe ? "border-pitch-accent/30 bg-pitch-accent/5 shadow-[0_0_15px_rgba(203,255,0,0.05)]" : "border-white/10"
                                                    )}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center overflow-hidden border border-white/10">
                                                                    {player.profiles?.avatar_url ? (
                                                                        <img src={player.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-white/20 font-black text-xs">PS</span>
                                                                    )}
                                                                </div>
                                                                {isMe && (
                                                                    <div className="absolute -top-1 -right-1 bg-pitch-accent text-black text-[8px] font-black uppercase px-1 rounded shadow-sm">Me</div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className={cn("font-bold uppercase text-sm", isMe && "text-pitch-accent")}>
                                                                    {player.profiles?.full_name || 'Anonymous'}
                                                                </p>
                                                                <p className="text-[10px] font-black uppercase text-pitch-secondary tracking-widest">{player.role || 'Member'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {player.checked_in && (
                                                                <div className="flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                                                                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                                                                    <span className="text-[8px] font-black uppercase text-green-400">In</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Mini Info / Support */}
                            <div className="space-y-6">
                                {/* Split Pay Status Card */}
                                {isRostered && game.team_price && (
                                    <div className="bg-pitch-accent/5 border border-pitch-accent/20 p-6 rounded-sm space-y-4 shadow-[0_0_20px_rgba(203,255,0,0.05)]">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-black uppercase text-[10px] tracking-[0.2em] text-pitch-accent">Split Pay Status</h4>
                                            <Wallet className="w-4 h-4 text-pitch-accent" />
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[8px] font-black uppercase text-white/40 mb-1">Your Estimated Share</p>
                                                <p className="text-3xl font-black italic tracking-tighter">${currentShare.toFixed(2)}</p>
                                                <p className="text-[9px] text-pitch-secondary mt-1 uppercase font-bold tracking-wider italic">Based on {teamSize} rostered players</p>
                                            </div>
                                            <div className="bg-black/40 p-3 rounded border border-white/5 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3 h-3 text-pitch-accent" />
                                                    <span className="text-[10px] font-bold uppercase">Charge Date</span>
                                                </div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">
                                                    {nextMatch ? new Date(nextMatch.start_time || '').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '---'}
                                                </p>
                                                <p className="text-[8px] text-pitch-secondary leading-tight">Balance will be auto-charged to your card on file 24h before kickoff.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="bg-gray-900 border border-gray-800 p-6 rounded-sm space-y-4">
                                    <h4 className="font-black uppercase text-xs tracking-[0.2em] text-pitch-secondary border-b border-white/5 pb-2">Venue Details</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs font-bold uppercase text-white/40 mb-1">Facility</p>
                                            <p className="font-bold">{game.location_nickname || game.facilities?.name || 'PitchSide Venue'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase text-white/40 mb-1">Address</p>
                                            <p className="text-sm text-pitch-secondary">{game.facilities?.address || game.location || 'Address TBD'}</p>
                                        </div>
                                        <button 
                                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(game.facilities?.address || game.location || '')}`, '_blank')}
                                            className="w-full py-3 bg-white/5 border border-white/10 rounded font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                                        >
                                            Open in Maps
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-900 border border-gray-800 p-6 rounded-sm space-y-4">
                                    <h4 className="font-black uppercase text-xs tracking-[0.2em] text-pitch-secondary border-b border-white/5 pb-2">Tournament Style</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-pitch-accent/10 p-2 rounded">
                                            <Trophy className="w-5 h-5 text-pitch-accent" />
                                        </div>
                                        <div>
                                            <p className="font-bold uppercase text-sm">{(game.tournament_style || 'Classic').replace(/_/g, ' ')}</p>
                                            <p className="text-[10px] font-black text-pitch-secondary uppercase tracking-widest">Format: {game.game_format_type}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STANDINGS TAB */}
                    {activeTab === 'standings' && (
                        <div className="animate-in fade-in duration-500">
                            {matches.length === 0 ? (
                                <div className="bg-[#171717] rounded-xl py-24 px-6 text-center border border-white/5">
                                    <Trophy className="w-12 h-12 text-pitch-secondary mx-auto mb-6 opacity-20" />
                                    <h3 className="text-xl font-black italic uppercase tracking-widest text-white mb-2">Standings Pending</h3>
                                    <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.2em] leading-relaxed max-w-md mx-auto">
                                        Waiting for Commissioner to release the schedule.
                                    </p>
                                </div>
                            ) : (
                                <StandingsTable 
                                    gameId={game.id} 
                                    teams={teams} 
                                    matches={matches}
                                    isPublicMode={true}
                                    highlightTeamId={teamId}
                                />
                            )}
                        </div>
                    )}

                    {/* SCHEDULE TAB */}
                    {activeTab === 'schedule' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <h3 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                                <Calendar className="w-6 h-6 text-pitch-accent" /> Tournament Schedule
                            </h3>
                            
                            {matches.length === 0 ? (
                                <div className="bg-[#171717] rounded-xl py-24 px-6 text-center border border-white/5">
                                    <Calendar className="w-12 h-12 text-pitch-secondary mx-auto mb-6 opacity-20" />
                                    <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Full Schedule Pending</h4>
                                    <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.2em] leading-relaxed max-w-sm mx-auto">
                                        Waiting for Commissioner to release the schedule.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {matches.map((match) => {
                                        const isUserMatch = match.home_team_id === teamId || match.away_team_id === teamId;
                                        return (
                                            <div 
                                                key={match.id} 
                                                className={cn(
                                                    "p-4 border rounded-sm transition-all",
                                                    isUserMatch 
                                                        ? "bg-pitch-accent/5 border-pitch-accent" 
                                                        : "bg-white/5 border-white/10 opacity-60 grayscale-[0.5]"
                                                )}
                                            >
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-pitch-secondary">{match.field_name || 'Field TBD'}</span>
                                                    <span className="text-[9px] font-mono text-white/40">{new Date(match.start_time || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className={cn("flex-1 text-sm font-bold uppercase truncate", match.home_team_id === teamId && "text-pitch-accent")}>
                                                        {match.home_team_name || 'Home'}
                                                    </div>
                                                    <div className="text-[10px] font-black text-white/20 italic">VS</div>
                                                    <div className={cn("flex-1 text-right text-sm font-bold uppercase truncate", match.away_team_id === teamId && "text-pitch-accent")}>
                                                        {match.away_team_name || 'Away'}
                                                    </div>
                                                </div>
                                                {match.status === 'completed' && (
                                                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-center gap-4">
                                                        <span className="font-black text-lg">{match.home_score}</span>
                                                        <span className="text-white/20">-</span>
                                                        <span className="font-black text-lg">{match.away_score}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* RULES & INFO TAB */}
                    {activeTab === 'rules' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto space-y-12">
                            <div className="space-y-6">
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                                    <Info className="w-8 h-8 text-pitch-accent" /> Tournament Description
                                </h3>
                                <div className="bg-white/5 border border-white/10 p-8 rounded-sm text-pitch-secondary leading-relaxed space-y-4 whitespace-pre-wrap">
                                    {game.rules_description || "The organizer has not provided a custom description for this tournament yet."}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                                    <Shield className="w-8 h-8 text-pitch-accent" /> Rules & Conduct
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { title: "Standard FIFA Rules", desc: "Unless specified otherwise in the variant section." },
                                        { title: "No Slide Tackles", desc: "This is a social/competitive tournament. Play safe." },
                                        { title: "Referee Authority", desc: "All on-field decisions are final. Respect the crew." },
                                        { title: "Zero Tolerance", desc: "Zero tolerance for verbal or physical abuse toward staff or players." }
                                    ].map((rule, idx) => (
                                        <div key={idx} className="bg-black/40 border border-white/10 p-5 rounded-sm">
                                            <p className="text-pitch-accent font-black uppercase text-xs mb-2 tracking-widest">{rule.title}</p>
                                            <p className="text-sm text-white/60">{rule.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CHAT TAB */}
                    {activeTab === 'chat' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ChatInterface 
                                gameId={teamId} // Isolating chat to the TEAM, not the tournament
                                currentUserId={user.id}
                                isParticipant={true}
                            />
                            <p className="mt-4 text-[10px] font-black uppercase text-pitch-secondary tracking-widest text-center italic">
                                Secure Line: This chat is restricted to the {teamName} roster only.
                            </p>
                        </div>
                    )}

                </div>
            </div>

            <LeaveConfirmationModal 
                isOpen={showLeaveModal}
                onClose={() => setShowLeaveModal(false)}
                onConfirm={handleLeaveTournament}
                isProcessing={isLeaving}
                tournamentTitle={game.title}
            />
        </div>
    );
}
