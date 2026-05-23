// 🏗️ Architecture: [[League Architecture.md]]
'use client';

import { Calendar, Trophy, ArrowRight, MapPin, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { isLeagueLocked } from '@/lib/league-utils';

interface LeagueData {
    id: string;
    title?: string;
    name?: string;
    location?: string;
    location_nickname?: string;
    start_time?: string | null;
    end_time?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    team_price?: number | null;
    price?: number | null;
    free_agent_price?: number | null;
    price_per_free_agent?: number | null;
    max_teams?: number | null;
    prize_type?: string | null;
    prize_pool_percentage?: number | null;
    fixed_prize_amount?: number | null;
    reward?: string | null;
    roster_lock_date?: string | null;
    regular_season_start?: string | null;
    playoff_start_date?: string | null;
    league_format?: 'structured' | 'rolling' | null;
}

interface TournamentRegistration {
    user_id: string;
    team_id: string | null;
    role: string;
}

interface LeagueCardProps {
    league: LeagueData;
    userId?: string;
    registrations?: TournamentRegistration[];
}

export function LeagueCard({ league, userId, registrations }: LeagueCardProps) {
    const router = useRouter();

    const userReg = userId ? registrations?.find(r => r.user_id === userId) : null;
    const userRole = userReg?.role;
    const userTeamId = userReg?.team_id;

    // Harmonize data fields
    const title = league.title || league.name || 'Untitled League';
    const teamPrice = league.team_price ?? league.price ?? null;
    const freeAgentPrice = league.free_agent_price ?? league.price_per_free_agent ?? null;
    const faPrice = freeAgentPrice; 
    const regularSeasonStart = league.regular_season_start || league.start_date || league.start_time || null;
    
    const isLocked = isLeagueLocked(league);
    
    const uniqueTeamIds = new Set(registrations?.map(r => r.team_id).filter(Boolean));
    const teamCount = uniqueTeamIds.size;

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'TBD';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getPrizeDisplay = () => {
        if (!league.prize_type || league.prize_type === 'No Official Prize') return 'Bragging Rights';
        if (league.prize_type === 'Percentage Pool (Scaling Pot)') {
            return `${league.prize_pool_percentage || 0}% Pool`;
        }
        if (league.prize_type === 'Fixed Cash Bounty') {
            return `$${league.fixed_prize_amount || 0}`;
        }
        if (league.prize_type === 'Physical Item') {
            return league.reward || 'Trophy';
        }
        return 'TBD';
    };

    return (
        <div className="bg-pitch-card border border-white/5 rounded-sm p-6 shadow-2xl hover:border-blue-600/20 transition-all group overflow-hidden relative flex flex-col h-full">
            {/* Glossy Overlay Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            {/* Status Indicator Bar */}
            <div className={cn(
                "absolute top-0 left-0 w-1 h-full transition-colors z-20",
                league.league_format === 'rolling' ? "bg-blue-600" : "bg-blue-600"
            )} />

            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-blue-600/10 border border-blue-600/20 px-2 py-0.5 rounded-sm flex items-center justify-center">
                                <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest whitespace-nowrap">Multi-Week League</span>
                            </div>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-[0.85] mb-4 font-sans break-words overflow-hidden">
                            {title}
                        </h2>
                        <div className="flex flex-col gap-2 text-pitch-secondary text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-blue-500" />
                                Start: {formatDate(regularSeasonStart)} - Playoffs: {formatDate(league.playoff_start_date || league.end_date || league.end_time || null)}
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-blue-500" />
                                {league.location_nickname || (league.location && league.location.split(',')[0]) || 'Remote / TBD'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline Matrix */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-blue-500 transition-colors flex items-center gap-1">
                            <Users className="w-4 h-4" /> Teams
                        </div>
                        <div className="text-white font-bold text-xs uppercase">{teamCount} / {league.max_teams || '∞'}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-blue-500 transition-colors flex items-center gap-1">
                            <Trophy className="w-4 h-4" /> Playoffs
                        </div>
                        <div className="text-white font-bold text-xs uppercase">{formatDate(league.playoff_start_date || league.end_time || league.end_date || null)}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-blue-500 transition-colors flex items-center gap-1">
                            <Trophy className="w-4 h-4" /> Prize
                        </div>
                        <div className="text-blue-500 font-black text-xs uppercase truncate">{getPrizeDisplay()}</div>
                    </div>
                </div>


                {/* Action Footer */}
                <div className="mt-auto">
                    {userRole === 'captain' && userTeamId ? (
                        <button
                            onClick={() => router.push(`/leagues/${league.id}/team/${userTeamId}`)}
                            className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.15)] rounded-sm group/btn min-h-[44px]"
                        >
                            Captain's Command Center <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : (userRole === 'player' || userRole === 'registered') && userTeamId ? (
                         <button
                            onClick={() => router.push(`/leagues/${league.id}/team/${userTeamId}`)}
                            className="w-full py-5 bg-transparent border border-white/20 text-white font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all transform active:scale-95 flex items-center justify-center gap-2 rounded-sm group/btn min-h-[44px]"
                        >
                            Team Command Center <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : userRole ? (
                        <button
                            onClick={() => router.push(`/leagues/${league.id}`)}
                            className="col-span-1 sm:col-span-2 w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.15)] rounded-sm group/btn min-h-[44px]"
                        >
                            Explore Details <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : isLocked ? (
                        <div className="w-full py-5 border border-blue-600/30 bg-blue-600/10 rounded-sm text-center min-h-[44px]">
                            <span className="text-blue-500 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                Registration Closed
                            </span>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => router.push(`/leagues/${league.id}/register?type=team`)}
                                className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 group/btn shadow-[0_0_20px_rgba(37,99,235,0.15)] rounded-sm min-h-[44px]"
                            >
                                <span className="flex items-center gap-2">Register Team <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" /></span>
                                {teamPrice !== null && <span className="text-[10px] opacity-70">(${teamPrice})</span>}
                            </button>
                            {(faPrice !== null && faPrice >= 0) && (
                                <button
                                    onClick={() => router.push(`/leagues/${league.id}/register?type=free_agent`)}
                                    className="w-full py-5 border border-blue-600/50 text-blue-500 font-black uppercase tracking-widest text-xs hover:bg-blue-600/10 transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 rounded-sm flex-1 mt-3 min-h-[44px]"
                                >
                                    <span>Join Free Agent</span>
                                    <span className="text-[10px] opacity-70">(${faPrice})</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
