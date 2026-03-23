'use client';

import { useState } from 'react';
import { Trophy, Calendar, MapPin, Users, ArrowRight, ShieldAlert, CheckCircle2, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Team {
    id: string;
    name: string;
    primary_color: string | null;
}

interface TournamentLobbyClientProps {
    tournament: {
        id: string;
        title: string;
        location: string;
        start_time: string;
        end_time: string | null;
        team_price: number | null;
        free_agent_price: number | null;
    };
    teams: Team[];
    matchesCount: number;
}

export function TournamentLobbyClient({ tournament, teams, matchesCount }: TournamentLobbyClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'teams' | 'schedule' | 'rules'>('teams');

    // Basic date formatting
    const startDate = new Date(tournament.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const startTimeStamp = new Date(tournament.start_time).getTime();
    const isPastCutoff = Date.now() > startTimeStamp; // Assuming cutoff is exactly start time for now

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pt-32 px-4 pb-24 selection:bg-pitch-accent selection:text-pitch-black">
            <div className="max-w-5xl mx-auto space-y-12">
                
                {/* Hero Section */}
                <div className="border-t-4 border-pitch-accent pt-8">
                    <p className="text-pitch-secondary text-xs font-black uppercase tracking-widest bg-white/5 py-1 px-3 rounded-full inline-block mb-3 border border-white/10">
                        Official Micro-Tournament
                    </p>
                    <h1 className="font-heading text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-6">
                        {tournament.title}
                    </h1>
                    
                    <div className="flex flex-wrap gap-6 mb-8">
                        <div className="flex items-center gap-2 text-gray-300 font-bold uppercase tracking-wider text-sm">
                            <Calendar className="w-5 h-5 text-pitch-accent" />
                            {startDate}
                        </div>
                        <div className="flex items-center gap-2 text-gray-300 font-bold uppercase tracking-wider text-sm">
                            <MapPin className="w-5 h-5 text-pitch-accent" />
                            {tournament.location}
                        </div>
                        <div className="flex items-center gap-2 text-green-400 font-black uppercase tracking-widest text-sm bg-green-500/10 px-3 py-1 rounded border border-green-500/20">
                            <Users className="w-5 h-5" />
                            {teams.length} Teams Registered
                        </div>
                    </div>

                    {/* Dual CTAs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                        {isPastCutoff ? (
                            <div className="col-span-1 sm:col-span-2 text-center py-6 bg-red-500/10 border border-red-500/30 text-red-500 font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded">
                                <ShieldAlert className="w-5 h-5" /> Registration Closed
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={() => router.push(`/tournaments/${tournament.id}/register?type=team`)}
                                    className="py-5 bg-pitch-accent text-pitch-black font-black uppercase tracking-widest hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 rounded-sm"
                                >
                                    Register a Team <ArrowRight className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => router.push(`/tournaments/${tournament.id}/register?type=free_agent`)}
                                    className="py-5 border border-white/20 text-white font-black uppercase tracking-widest hover:bg-white/5 transition-all transform active:scale-95 rounded-sm"
                                >
                                    Join Free Agent Pool
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabbed Architecture */}
                <div className="pt-8">
                    <div className="flex overflow-x-auto border-b border-white/10 no-scrollbar mb-8">
                        {(['teams', 'schedule', 'rules'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-4 font-black uppercase tracking-widest text-sm whitespace-nowrap transition-colors border-b-2 ${
                                    activeTab === tab 
                                    ? 'text-pitch-accent border-pitch-accent bg-gradient-to-t from-pitch-accent/10 to-transparent' 
                                    : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
                                }`}
                            >
                                {tab === 'teams' ? 'Registered Teams' : tab === 'schedule' ? 'Bracket & Schedule' : 'Rules & Details'}
                            </button>
                        ))}
                    </div>

                    {/* Tab Panels */}
                    <div className="min-h-[40vh]">
                        
                        {/* Tab 1: Teams */}
                        {activeTab === 'teams' && (
                            <div className="animate-in fade-in duration-500">
                                {teams.length === 0 ? (
                                    <div className="text-center py-24 bg-black/50 border border-dashed border-white/10 rounded-2xl">
                                        <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-500 font-bold uppercase text-sm tracking-widest">No teams have verified their spot yet.</p>
                                        <p className="text-gray-600 mt-2 text-xs">Be the first to secure a slot for the tournament.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {teams.map(team => (
                                            <div key={team.id} className="relative overflow-hidden bg-pitch-card border border-white/5 rounded-xl p-6 group hover:border-white/20 transition-all flex items-center gap-4">
                                                <div 
                                                    className="w-2 absolute inset-y-0 left-0" 
                                                    style={{ backgroundColor: team.primary_color || '#333' }}
                                                />
                                                <div className="w-12 h-12 rounded bg-black flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-110 transition-transform">
                                                    <Shield className="w-6 h-6" style={{ color: team.primary_color || '#cbff00' }} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black uppercase tracking-wider text-sm">{team.name}</h3>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 text-green-400">Verified</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab 2: Schedule */}
                        {activeTab === 'schedule' && (
                            <div className="animate-in fade-in duration-500">
                                {matchesCount > 0 ? (
                                    <div className="text-center py-24">
                                        {/* Matches will be mapped here eventually */}
                                        <p className="text-pitch-accent font-bold uppercase tracking-widest text-sm">{matchesCount} Matches Scheduled</p>
                                        <p className="text-gray-500 mt-2">The bracket has been materialized.</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-24 bg-black/50 border border-dashed border-white/10 rounded-2xl">
                                        <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                        <h3 className="text-xl font-black italic uppercase tracking-widest text-white mb-2">Bracket Undisclosed</h3>
                                        <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.2em] leading-relaxed max-w-md mx-auto px-4">
                                            The Schedule & full visual Bracket will be strictly released immediately after registration closes.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab 3: Rules & Details */}
                        {activeTab === 'rules' && (
                            <div className="animate-in fade-in duration-500 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h3 className="text-lg font-black uppercase italic tracking-widest flex items-center gap-2 border-b border-white/10 pb-4">
                                        <CheckCircle2 className="w-5 h-5 text-pitch-accent" /> Match Format
                                    </h3>
                                    <ul className="space-y-4 font-bold tracking-wider text-gray-300 text-sm">
                                        <li className="flex gap-3"><span className="text-pitch-accent">■</span> 5v5 (4 outfielders, 1 goalie)</li>
                                        <li className="flex gap-3"><span className="text-pitch-accent">■</span> Two 12-minute halves</li>
                                        <li className="flex gap-3"><span className="text-pitch-accent">■</span> Running clock, strictly enforced</li>
                                        <li className="flex gap-3"><span className="text-pitch-accent">■</span> Zero tolerance for hard tackle fouls</li>
                                    </ul>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-lg font-black uppercase italic tracking-widest flex items-center gap-2 border-b border-white/10 pb-4">
                                        <CheckCircle2 className="w-5 h-5 text-pitch-accent" /> Pitch Policy
                                    </h3>
                                    <ul className="space-y-4 font-bold tracking-wider text-gray-300 text-sm">
                                        <li className="flex gap-3"><span className="text-white">TURF SHOES ONLY.</span> Cleats with studs are strictly banned from the surface.</li>
                                        <li className="flex gap-3"><span className="text-white">Jerseys:</span> Teams must wear their primary color or matching bibs provided by Pitchside.</li>
                                        <li className="flex gap-3"><span className="text-white">Arrival:</span> Captains must check in their team 15 minutes before opening whistle.</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
