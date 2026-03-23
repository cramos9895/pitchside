'use client';

import { Calendar, Users, Trophy, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface League {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    format: string;
    match_day: string;
    price_per_team: number;
    price_per_free_agent: number;
    status: string;
}

interface LeagueCardProps {
    league: League;
    userRole?: string;
    userTeamId?: string;
}

export function LeagueCard({ league, userRole, userTeamId }: LeagueCardProps) {
    const router = useRouter();

    const formatDate = (dateString: string) => {
        if (!dateString) return 'TBD';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="bg-pitch-card border border-white/5 rounded-sm p-6 shadow-2xl hover:border-pitch-accent/20 transition-all group overflow-hidden relative flex flex-col h-full">
            {/* Glossy Overlay Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 mr-4">
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-[0.85] mb-3 font-sans break-words overflow-hidden">
                            {league.name}
                        </h2>
                        <div className="flex items-center gap-2 text-pitch-secondary text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                            <Calendar className="w-3 h-3 text-pitch-accent" />
                            {formatDate(league.start_date)} — {formatDate(league.end_date)}
                        </div>
                    </div>
                    <div className="shrink-0 bg-pitch-accent/10 border border-pitch-accent/20 px-3 py-1 rounded-full">
                        <span className="text-[10px] font-black uppercase text-pitch-accent tracking-widest whitespace-nowrap">Registration Open</span>
                    </div>
                </div>

                {/* Details Matrix */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-white/5 p-4 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors">Format</div>
                        <div className="text-white font-bold text-sm uppercase">{league.format || '5v5'}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors">Match Day</div>
                        <div className="text-white font-bold text-sm uppercase">{league.match_day || 'Tuesdays'}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors">Team Price</div>
                        <div className="text-pitch-accent font-black text-sm uppercase">{league.price_per_team ? `$${league.price_per_team}` : 'FREE'}</div>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                    {userRole === 'captain' && userTeamId ? (
                        <button
                            onClick={() => router.push(`/tournaments/${league.id}/team/${userTeamId}`)}
                            className="col-span-1 sm:col-span-2 w-full py-4 bg-[#cbff00] text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.15)] rounded-sm group/btn"
                        >
                            Captain's Command Center <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : userRole ? (
                        <button
                            onClick={() => router.push(`/dashboard/tournaments/${league.id}`)}
                            className="col-span-1 sm:col-span-2 w-full py-4 bg-white/10 text-white border border-white/20 font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 rounded-sm group/btn"
                        >
                            View Player Dashboard <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <>
                            <button 
                                onClick={() => router.push(`/leagues/${league.id}`)}
                                className="w-full py-4 bg-[#cbff00] text-pitch-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 group/btn shadow-[0_0_20px_rgba(204,255,0,0.15)]"
                            >
                                Register a Team <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                            <button 
                                onClick={() => router.push(`/leagues/${league.id}?mode=free-agent`)}
                                className="w-full py-4 border border-[#cbff00]/50 text-[#cbff00] font-black uppercase tracking-widest text-xs hover:bg-[#cbff00]/10 transition-all transform active:scale-95"
                            >
                                Join as Free Agent
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
