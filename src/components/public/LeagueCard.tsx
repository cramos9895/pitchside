'use client';

import { Calendar, Users, Trophy, ArrowRight, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface LeagueData {
    id: string;
    title?: string;
    name?: string; // from 'leagues' table
    location?: string;
    location_nickname?: string;
    start_time?: string | null;
    end_time?: string | null;
    start_date?: string | null; // from 'leagues' table
    end_date?: string | null; // from 'leagues' table
    team_price?: number | null;
    price?: number | null; // from 'leagues' table
    free_agent_price?: number | null;
    price_per_free_agent?: number | null; // from 'leagues' table
    max_teams?: number | null;
    prize_type?: string | null;
    prize_pool_percentage?: number | null;
    fixed_prize_amount?: number | null;
    reward?: string | null;
    roster_lock_date?: string | null;
    regular_season_start?: string | null;
    playoff_start_date?: string | null;
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
    const startTime = league.start_time || league.start_date || null;
    const teamPrice = league.team_price ?? league.price ?? null;
    const freeAgentPrice = league.free_agent_price ?? league.price_per_free_agent ?? null;
    const regularSeasonStart = league.regular_season_start || league.start_date || null;

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
            return `$${league.fixed_prize_amount || 0} Bounty`;
        }
        if (league.prize_type === 'Physical Item') {
            return league.reward || 'Trophy';
        }
        return 'TBD';
    };

    return (
        <div className="bg-pitch-card border border-white/5 rounded-sm p-6 shadow-2xl hover:border-pitch-accent/20 transition-all group overflow-hidden relative flex flex-col h-full">
            {/* Glossy Overlay Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            {/* Status Indicator Bar */}
            <div className="absolute top-0 left-0 w-1 h-full bg-pitch-accent opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col h-full pl-2">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="bg-pitch-accent/10 border border-pitch-accent/20 px-2 py-0.5 rounded-full">
                                <span className="text-[8px] font-black uppercase text-pitch-accent tracking-widest whitespace-nowrap">Multi-Week League</span>
                            </div>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-[0.85] mb-4 font-sans break-words overflow-hidden">
                            {title}
                        </h2>
                        <div className="flex flex-col gap-2 text-pitch-secondary text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-pitch-accent" />
                                {league.location_nickname || (league.location && league.location.split(',')[0]) || 'Remote / TBD'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline Matrix */}
                <div className="grid grid-cols-3 gap-2 mb-8">
                    <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Start
                        </div>
                        <div className="text-white font-bold text-[11px] uppercase">{formatDate(regularSeasonStart ?? null)}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                            <Trophy className="w-2.5 h-2.5" /> Playoffs
                        </div>
                        <div className="text-white font-bold text-[11px] uppercase">{formatDate(league.end_time || league.end_date || null)}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                             Prize
                        </div>
                        <div className="text-pitch-accent font-black text-[10px] uppercase truncate">{getPrizeDisplay()}</div>
                    </div>
                </div>

                {/* Info Bar */}
                <div className="mb-8 flex items-center justify-between px-1">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Roster Lock</span>
                            <span className="text-[10px] text-white font-bold">{formatDate(league.roster_lock_date ?? null)}</span>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Max Teams</span>
                            <span className="text-[10px] text-white font-bold">{league.max_teams || 'Unlimited'}</span>
                        </div>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                    {userRole === 'captain' && userTeamId ? (
                        <button
                            onClick={() => router.push(`/tournaments/${league.id}/team/${userTeamId}`)}
                            className="col-span-1 sm:col-span-2 w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.15)] rounded-sm group/btn"
                        >
                            Captain's Command Center <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : userRole ? (
                        <button
                            onClick={() => {
                                const leagueId = league.id || (userReg as any).game_id;
                                router.push(`/dashboard/tournaments/${leagueId}`);
                            }}
                            className="col-span-1 sm:col-span-2 w-full py-4 bg-white/10 text-white border border-white/20 font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 rounded-sm group/btn"
                        >
                            View Player Dashboard <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => router.push(`/tournaments/${league.id}/register?type=team`)}
                                className="w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 group/btn shadow-[0_0_20px_rgba(204,255,0,0.15)] rounded-sm"
                            >
                                <span className="flex items-center gap-2">Register Team <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" /></span>
                                {teamPrice !== null && <span className="text-[10px] opacity-70">(${teamPrice})</span>}
                            </button>
                            {(freeAgentPrice !== null && freeAgentPrice >= 0) && (
                                <button
                                    onClick={() => router.push(`/tournaments/${league.id}/register?type=free_agent`)}
                                    className="w-full py-4 border border-pitch-accent/50 text-pitch-accent font-black uppercase tracking-widest text-xs hover:bg-pitch-accent/10 transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 rounded-sm"
                                >
                                    <span>Join Free Agent</span>
                                    <span className="text-[10px] opacity-70">(${freeAgentPrice})</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
