'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Clock, MapPin, Trophy, Calendar, Users, AlertTriangle, ArrowRight, CreditCard } from 'lucide-react';

interface Player {
    id: string;
    full_name: string;
    role: string;
}

interface Match {
    id: string;
    start_time: string;
    field_name: string;
    home_team: string; // ID
    away_team: string; // ID
    home_team_name: string;
    away_team_name: string;
    home_score: number | null;
    away_score: number | null;
    status: string;
}

interface PlayerDashboardProps {
    tournament: {
        id: string;
        title: string;
        location: string;
    };
    team: {
        id: string;
        name: string;
        primary_color: string | null;
    };
    registration: {
        id: string;
        payment_status: string;
        amount_owed: number;
    };
    roster: Player[];
    upcomingMatch: Match | null;
    allMatches: Match[];
}

export function PlayerDashboardClient({ tournament, team, registration, roster, upcomingMatch, allMatches }: PlayerDashboardProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'roster' | 'schedule' | 'bracket'>('roster');
    
    // Filter live matches sequentially hooked to this Player's team_id
    const myMatches = allMatches.filter(m => m.home_team === team.id || m.away_team === team.id);

    const handlePayNow = () => {
        // Since Stripe logic isn't strictly requested for Lobby B right here (just the UI CTA), I'll make it redirect to the payment pipeline or alert.
        alert(`Proceeding to Stripe Checkout for $${registration.amount_owed}`);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pt-32 px-4 pb-24 selection:bg-[#cbff00] selection:text-black">
            
            {/* Payment Enforcement Banner */}
            {registration.payment_status === 'pending' && registration.amount_owed > 0 && (
                <div className="fixed top-20 left-0 right-0 z-50 animate-in slide-in-from-top-4 duration-500">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-lg p-5 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 border-y border-r border-red-500/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-500/20 rounded-full shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="font-heading text-xl font-black uppercase italic text-red-500 tracking-wider">Action Required</h3>
                                    <p className="font-bold text-gray-300 text-sm mt-1">
                                        Your captain has assigned your portion of the team fee. You owe <span className="text-white">${registration.amount_owed.toFixed(2)}</span>.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handlePayNow}
                                className="w-full sm:w-auto px-8 py-3 bg-red-500 text-white font-black uppercase tracking-widest text-sm rounded-sm hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2 shrink-0"
                            >
                                <CreditCard className="w-4 h-4" /> Pay Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto space-y-12">
                
                {/* Header */}
                <div className="border-t-4 border-[#cbff00] pt-8 bg-gradient-to-br from-white/5 to-transparent p-8 rounded-b-2xl border-x border-b border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#cbff00]/5 blur-[100px] pointer-events-none" />
                    <p className="text-pitch-secondary text-xs font-black uppercase tracking-widest bg-black/50 py-1 px-3 rounded-full inline-block mb-4 border border-white/10 shadow-inner">
                        Tournament Player Dashboard
                    </p>
                    <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none mb-4 break-words">
                        {tournament.title}
                    </h1>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-black flex items-center justify-center border border-white/10 shrink-0">
                            <Shield className="w-5 h-5" style={{ color: team.primary_color || '#cbff00' }} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-0.5">Representing</p>
                            <h2 className="text-xl font-black uppercase tracking-wider text-white">
                                {team.name}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Next Match Hero */}
                {upcomingMatch && (
                    <div className="space-y-4">
                        <h3 className="font-heading text-2xl font-black italic uppercase tracking-wider text-[#cbff00] flex items-center gap-2">
                            <Clock className="w-6 h-6" /> Next Match
                        </h3>
                        
                        <div className="bg-pitch-card border-l-4 border-[#cbff00] rounded-r-xl border-y border-r border-white/5 p-6 md:p-10 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#cbff00]/5 to-transparent pointer-events-none opacity-50" />
                            
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                
                                {/* Home Team */}
                                <div className="flex-1 text-center md:text-right">
                                    <h4 className={`font-heading text-3xl md:text-4xl font-black italic uppercase tracking-tighter ${upcomingMatch.home_team === team.id ? 'text-white' : 'text-gray-400'}`}>
                                        {upcomingMatch.home_team_name}
                                    </h4>
                                    {upcomingMatch.home_team === team.id && (
                                        <span className="inline-block mt-2 bg-[#cbff00]/20 text-[#cbff00] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-[#cbff00]/30">You</span>
                                    )}
                                </div>

                                {/* VS / Info */}
                                <div className="shrink-0 flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-inner relative">
                                        <div className="absolute inset-0 border-2 border-[#cbff00]/20 rounded-full animate-ping opacity-20" />
                                        <span className="font-heading text-2xl font-black italic text-gray-500">VS</span>
                                    </div>
                                    <div className="mt-6 text-center">
                                        <div className="text-[#cbff00] font-black uppercase text-lg tracking-wider bg-[#cbff00]/10 px-4 py-1 rounded-full border border-[#cbff00]/20 mb-2 whitespace-nowrap">
                                            {formatTime(upcomingMatch.start_time)}
                                        </div>
                                        <div className="text-sm font-bold uppercase text-gray-400 tracking-wider">
                                            {formatDate(upcomingMatch.start_time)}
                                        </div>
                                        <div className="mt-2 text-xs font-bold uppercase text-gray-500 flex items-center justify-center gap-1">
                                            <MapPin className="w-3 h-3" /> {upcomingMatch.field_name}
                                        </div>
                                    </div>
                                </div>

                                {/* Away Team */}
                                <div className="flex-1 text-center md:text-left">
                                    <h4 className={`font-heading text-3xl md:text-4xl font-black italic uppercase tracking-tighter ${upcomingMatch.away_team === team.id ? 'text-white' : 'text-gray-400'}`}>
                                        {upcomingMatch.away_team_name}
                                    </h4>
                                    {upcomingMatch.away_team === team.id && (
                                        <span className="inline-block mt-2 bg-[#cbff00]/20 text-[#cbff00] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-[#cbff00]/30">You</span>
                                    )}
                                </div>
                                
                            </div>
                        </div>
                    </div>
                )}

                {/* Player Tabs */}
                <div className="pt-8">
                    <div className="flex overflow-x-auto border-b border-white/10 no-scrollbar mb-8">
                        {(['roster', 'schedule', 'bracket'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 md:px-10 py-4 font-black uppercase tracking-widest text-sm whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
                                    activeTab === tab 
                                    ? 'text-[#cbff00] border-[#cbff00] bg-gradient-to-t from-[#cbff00]/10 to-transparent shadow-[inset_0_-1px_0_rgba(204,255,0,0.5)]' 
                                    : 'text-gray-500 border-transparent hover:text-white hover:border-white/20'
                                }`}
                            >
                                {tab === 'roster' ? <><Users className="w-4 h-4" /> My Team</> : tab === 'schedule' ? <><Calendar className="w-4 h-4" /> Full Schedule</> : <><Trophy className="w-4 h-4" /> Standings / Bracket</>}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[40vh]">
                        {/* Tab 1: Roster */}
                        {activeTab === 'roster' && (
                            <div className="animate-in fade-in duration-500">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {roster.map(member => (
                                        <div key={member.id} className="bg-black/40 border border-white/5 rounded-lg p-5 flex items-center gap-4 hover:border-white/20 transition-colors">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-xl font-black uppercase italic text-gray-500 shrink-0 shadow-inner">
                                                {member.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white uppercase tracking-wider text-sm">{member.full_name}</h4>
                                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${member.role === 'captain' ? 'text-[#cbff00]' : 'text-gray-500'}`}>
                                                    {member.role === 'captain' ? 'Captain' : 'Player'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {roster.length === 0 && (
                                    <div className="text-center py-24 bg-black/50 border border-dashed border-white/10 rounded-2xl">
                                        <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-500 font-bold uppercase text-sm tracking-widest">No verified roster members.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab 2: Schedule */}
                        {activeTab === 'schedule' && (
                            <div className="animate-in fade-in duration-500 space-y-4">
                                {myMatches.length === 0 ? (
                                    <div className="text-center py-24 bg-black/50 border border-dashed border-white/10 rounded-2xl">
                                        <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                        <h3 className="text-xl font-black italic uppercase tracking-widest text-white mb-2">Schedule Pending</h3>
                                        <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.2em] leading-relaxed max-w-md mx-auto">
                                            The tournament director has not released the matches yet.
                                        </p>
                                    </div>
                                ) : (
                                    myMatches.map(match => (
                                        <div key={match.id} className="bg-pitch-card border border-white/5 rounded-sm p-4 hover:border-white/20 transition-colors flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 text-center md:text-left w-full md:w-auto">
                                                <div className="bg-black/50 border border-white/10 px-4 py-2 rounded text-center min-w-[120px]">
                                                    <p className="text-[#cbff00] font-black uppercase text-sm tracking-wider">{formatTime(match.start_time)}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{formatDate(match.start_time)}</p>
                                                </div>
                                                <div className="hidden md:block">
                                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {match.field_name}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 w-full md:w-auto justify-center">
                                                <div className={`font-black uppercase italic tracking-tighter text-lg ${match.home_team === team.id ? 'text-white' : 'text-gray-500'}`}>
                                                    {match.home_team_name}
                                                </div>
                                                <span className="text-gray-600 font-black italic text-sm">VS</span>
                                                <div className={`font-black uppercase italic tracking-tighter text-lg ${match.away_team === team.id ? 'text-white' : 'text-gray-500'}`}>
                                                    {match.away_team_name}
                                                </div>
                                            </div>

                                            <div className="w-full md:w-auto flex justify-center md:justify-end">
                                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded border ${match.status === 'completed' ? 'bg-white/10 border-white/20 text-white' : 'bg-[#cbff00]/10 border-[#cbff00]/30 text-[#cbff00]'}`}>
                                                    {match.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Tab 3: Bracket */}
                        {activeTab === 'bracket' && (
                            <div className="animate-in fade-in duration-500 text-center py-24 bg-black/50 border border-dashed border-white/10 rounded-2xl">
                                <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                <h3 className="text-xl font-black italic uppercase tracking-widest text-[#cbff00] mb-2">Standings / Bracket</h3>
                                <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.2em] leading-relaxed max-w-md mx-auto">
                                    Official standings will be populated dynamically once matches are completed and scores are entered.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
