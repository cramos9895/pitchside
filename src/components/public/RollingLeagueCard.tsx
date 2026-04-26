'use client';

import { Calendar, Users, Trophy, ArrowRight, MapPin, Clock, Layers, Activity, Footprints, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { isLeagueLocked } from '@/lib/league-utils';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LeagueData {
    id: string;
    title?: string;
    name?: string;
    location?: string;
    location_nickname?: string;
    start_time?: string;
    start_date?: string;
    regular_season_start?: string;
    end_time?: string;
    end_date?: string;
    status?: string;
    total_game_time?: number;
    half_length?: number;
    team_price?: number;
    price?: number;
    price_per_free_agent?: number;
    free_agent_price?: number;
    game_format_type?: string;
    field_size?: string;
    shoe_types?: string[];
    surface_type?: string;
    payment_collection_type?: string;
    cash_fee_structure?: string;
    cash_amount?: number;
    team_registration_fee?: number;
    allow_free_agents?: boolean;
    prize_type?: string;
    fixed_prize_amount?: number;
    reward?: string;
}

interface TournamentRegistration {
    user_id: string;
    team_id: string | null;
    role: string;
    status?: string;
    teams?: {
        id: string;
        name: string;
        captain_id?: string;
    } | null;
}

interface RollingLeagueCardProps {
    league: LeagueData;
    userId?: string;
    registrations?: TournamentRegistration[];
}

export function RollingLeagueCard({ league, userId, registrations }: RollingLeagueCardProps) {
    const router = useRouter();

    const userReg = userId ? registrations?.find(r => r.user_id === userId) : null;
    const userRole = userReg?.role;
    const userTeamId = userReg?.team_id;
    const isBanned = userReg?.status === 'banned';
    const isCaptain = userReg?.teams?.captain_id === userId || userRole === 'captain';

    // Harmonize data fields
    const title = league.title || league.name || 'Untitled League';
    const startTime = league.regular_season_start || league.start_time || league.start_date || null;
    const isCash = league.payment_collection_type === 'cash';

    const getPrizeDisplay = () => {
        if (league.prize_type === 'Fixed Cash Bounty' && league.fixed_prize_amount) {
            return `$${league.fixed_prize_amount} Cash`;
        }
        if (league.prize_type === 'Physical Item' && league.reward) {
            return league.reward;
        }
        if (league.prize_type === 'Percentage Pool (Scaling Pot)') {
            return 'Scaling Cash Pot';
        }
        return league.prize_type || 'Trophy + Medals';
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'TBD';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const [loadingStats, setLoadingStats] = useState(false);
    const [teamName, setTeamName] = useState<string | null>(null);
    const [nextMatch, setNextMatch] = useState<any | null>(null);
    const [teamRank, setTeamRank] = useState<{ rank: string, points: number } | null>(null);

    useEffect(() => {
        if (!userTeamId || !league.id || isBanned) return;
        
        if (userReg?.teams?.name) {
             setTeamName(userReg.teams.name);
        }

        const fetchMatches = async () => {
            setLoadingStats(true);
            const supabase = createClient();
            const { data: matches } = await supabase
                .from('matches')
                .select('*')
                .eq('game_id', league.id);

            if (matches && matches.length > 0) {
                const now = new Date();
                const upcoming = matches
                    .filter((m: any) => (m.home_team_id === userTeamId || m.away_team_id === userTeamId) && new Date(m.start_time) > now)
                    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                
                if (upcoming.length > 0) {
                    setNextMatch(upcoming[0]);
                }

                const stats: Record<string, { points: number, gd: number }> = {};
                matches.forEach((m: any) => {
                    if (m.home_team_id) {
                         if (!stats[m.home_team_id]) stats[m.home_team_id] = { points: 0, gd: 0 };
                    }
                    if (m.away_team_id) {
                         if (!stats[m.away_team_id]) stats[m.away_team_id] = { points: 0, gd: 0 };
                    }

                    if (m.status === 'completed' && m.home_score !== null && m.away_score !== null) {
                        const hScore = m.home_score;
                        const aScore = m.away_score;
                        
                        stats[m.home_team_id].gd += (hScore - aScore);
                        stats[m.away_team_id].gd += (aScore - hScore);

                        if (hScore > aScore) {
                            stats[m.home_team_id].points += 3;
                        } else if (aScore > hScore) {
                            stats[m.away_team_id].points += 3;
                        } else {
                            stats[m.home_team_id].points += 1;
                            stats[m.away_team_id].points += 1;
                        }
                    }
                });

                const sortedTeams = Object.keys(stats).sort((a, b) => {
                    if (stats[b].points !== stats[a].points) {
                        return stats[b].points - stats[a].points;
                    }
                    return stats[b].gd - stats[a].gd;
                });

                const rankIndex = sortedTeams.indexOf(userTeamId);
                if (rankIndex !== -1) {
                    const rankNum = rankIndex + 1;
                    const suffix = ['st', 'nd', 'rd'][((rankNum + 90) % 100 - 10) % 10 - 1] || 'th';
                    setTeamRank({
                        rank: `${rankNum}${suffix}`,
                        points: stats[userTeamId].points
                    });
                }
            }
            setLoadingStats(false);
        };

        fetchMatches();
    }, [userTeamId, league.id, isBanned, userReg]);

    const renderBannedView = () => (
        <div className="flex-1 flex flex-col justify-between border-t border-red-500/50 mt-4 pt-4">
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-red-500 font-black uppercase text-sm tracking-widest">Account Suspended</h4>
                    <p className="text-red-200/70 text-xs mt-1">You have been permanently banned from this league. Access to team and schedule features has been revoked.</p>
                </div>
            </div>
            <div className="mt-6">
                <button
                    disabled
                    className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500/50 font-black uppercase tracking-widest text-xs rounded-sm cursor-not-allowed"
                >
                    Access Denied
                </button>
            </div>
        </div>
    );

    const renderFreeAgentView = () => (
        <div className="flex-1 flex flex-col justify-between mt-4">
            <div className="bg-pitch-accent/10 border border-pitch-accent/20 p-4 rounded-sm flex flex-col items-center justify-center text-center space-y-2 mb-6">
                <Users className="w-6 h-6 text-pitch-accent" />
                <h4 className="text-pitch-accent font-black uppercase text-sm tracking-widest">Free Agent Status</h4>
                <p className="text-white/70 text-xs">You are registered as a Free Agent. Pending team placement by league admins.</p>
            </div>
            <div className="mt-auto">
                <button
                    onClick={() => router.push(`/rolling-leagues/${league.id}`)}
                    className="w-full py-4 bg-pitch-accent text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.15)] rounded-sm group/btn"
                >
                    Free Agent Dashboard <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );

    const renderPlayerOrCaptainView = () => (
        <div className="flex-1 flex flex-col justify-between mt-2">
            {loadingStats ? (
                <div className="grid grid-cols-3 gap-2 mb-6 animate-pulse">
                    <div className="bg-white/5 h-20 rounded-sm border border-white/5"></div>
                    <div className="bg-white/5 h-20 rounded-sm border border-white/5"></div>
                    <div className="bg-white/5 h-20 rounded-sm border border-white/5"></div>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="bg-pitch-accent/10 p-3 rounded-sm border border-pitch-accent/20">
                        <div className="text-[8px] text-pitch-accent font-black uppercase mb-1 tracking-widest flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" /> Team
                        </div>
                        <div className="text-white font-bold text-[11px] uppercase truncate">{teamName || 'Your Team'}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-sm border border-white/5">
                        <div className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Next Match
                        </div>
                        <div className="text-white font-bold text-[11px] uppercase truncate">
                            {nextMatch ? formatDate(nextMatch.start_time) : 'TBD'}
                        </div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-sm border border-white/5">
                        <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest flex items-center gap-1">
                            <Trophy className="w-2.5 h-2.5" /> Rank
                        </div>
                        <div className="text-white font-black text-[10px] uppercase truncate">
                            {teamRank ? `${teamRank.rank} | ${teamRank.points} Pts` : 'TBD'}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="mt-auto">
                {isCaptain ? (
                    <button
                        onClick={() => router.push(`/rolling-leagues/${league.id}`)}
                        className="w-full py-4 bg-pitch-accent text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.15)] rounded-sm group/btn"
                    >
                        Captain's Command Center <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                ) : (
                    <button
                        onClick={() => router.push(`/rolling-leagues/${league.id}`)}
                        className="w-full py-4 bg-transparent border border-white/20 text-white font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all transform active:scale-95 flex items-center justify-center gap-2 rounded-sm group/btn"
                    >
                        Team Hub <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                )}
            </div>
        </div>
    );

    const renderUnregisteredView = () => (
        <div className="flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                    <div className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> Starts
                    </div>
                    <div className="text-white font-bold text-[11px] uppercase">{formatDate(startTime)}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                    <div className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Game Length
                    </div>
                    <div className="text-white font-bold text-[11px] uppercase">{league.half_length ? `${league.half_length * 2} minutes` : (league.total_game_time ? `${league.total_game_time} minutes` : 'TBD')}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                    <div className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                         Prize
                    </div>
                    <div className="text-pitch-accent font-black text-[10px] uppercase truncate">{getPrizeDisplay()}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-1">
                <div className="flex flex-col">
                    <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1"><Layers className="w-2 h-2" /> Format & Field Size</span>
                    <span className="text-[10px] text-white font-bold uppercase">{league.game_format_type || 'League Play'} - {league.field_size || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1"><Activity className="w-2 h-2" /> Surface Type</span>
                    <span className="text-[10px] text-white font-bold uppercase truncate">{league.surface_type || 'Standard / Turf'}</span>
                </div>
            </div>

            <div className="mb-6 px-1">
                <div className="flex flex-col">
                    <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1"><Footprints className="w-2 h-2" /> Recommended Gear</span>
                    <span className="text-[10px] text-white font-bold uppercase truncate">{league.shoe_types?.join(', ') || 'Any'}</span>
                </div>
            </div>

            <div className="mb-8 p-4 bg-white/5 border border-white/5 rounded-sm space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-gray-500">Entry Fee</span>
                    <span className="text-white">{isCash ? 'Cash at Door' : league.team_price ? `$${league.team_price}` : 'FREE'}</span>
                </div>
                
                {isCash ? (
                    <div className="flex justify-between items-center">
                        <span className="text-[8px] text-pitch-accent font-black uppercase tracking-widest italic">Door Fee: {league.cash_fee_structure?.replace('_', ' ')}</span>
                        <span className="text-lg font-black italic text-pitch-accent">${league.cash_amount || 0}</span>
                    </div>
                ) : (
                    league.team_registration_fee && (
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] text-pitch-accent font-black uppercase tracking-widest italic">Admin Deposit Required</span>
                            <span className="text-lg font-black italic text-pitch-accent">${league.team_registration_fee}</span>
                        </div>
                    )
                )}

                {(league.allow_free_agents && (league.free_agent_price || 0) > 0) && (
                    <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-gray-500">Free Agent Sign Up Fee</span>
                        <span className="text-white">${league.free_agent_price} {isCash ? '/ Match' : '/ Season'}</span>
                    </div>
                )}
            </div>

            <div className="mt-auto">
                <button
                    onClick={() => router.push(`/rolling-leagues/${league.id}`)}
                    className="w-full py-4 bg-pitch-accent text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(204,255,0,0.2)] rounded-sm group/btn"
                >
                    Explore Details <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );

    return (
        <div className={cn(
            "relative w-full overflow-hidden rounded-sm group transition-all duration-500 h-full flex flex-col",
            isBanned 
                ? "bg-[#111] border-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                : "bg-[#111] border border-white/10 hover:border-white/20 hover:shadow-[0_0_30px_rgba(204,255,0,0.05)]"
        )}>
            {/* Header / Title Area */}
            <div className="p-6 pb-4 border-b border-white/5 relative z-10 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-white/5 text-white/50 text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">
                        Rolling League
                    </span>
                    {isBanned && (
                        <span className="px-3 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm animate-pulse">
                            Suspended
                        </span>
                    )}
                </div>
                
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-white group-hover:text-pitch-accent transition-colors mb-2">
                    {title}
                </h3>
                
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    <MapPin className="w-3 h-3 text-pitch-accent" />
                    {league.location_nickname || league.location?.split(',')[0] || 'TBD'}
                </div>
            </div>

            {/* Inner Views */}
            <div className="p-6 flex-1 flex flex-col relative z-10 bg-gradient-to-b from-transparent to-black/50">
                {isBanned ? renderBannedView() : 
                 userTeamId ? renderPlayerOrCaptainView() :
                 userReg ? renderFreeAgentView() :
                 renderUnregisteredView()}
            </div>
        </div>
    );
}
