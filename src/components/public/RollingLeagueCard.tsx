// 🏗️ Architecture: [[League Architecture.md]]
'use client';


import { Calendar, Users, Trophy, ArrowRight, MapPin, Clock, Layers, Activity, Footprints, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { isLeagueLocked } from '@/lib/league-utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

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
    prize_pool_percentage?: number;
    fixed_prize_amount?: number;
    reward?: string;
    max_teams?: number | null;
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
    
    const validRegistrations = registrations?.filter(r => ['registered', 'paid', 'active', 'confirmed'].includes(r.status?.toLowerCase() || 'registered')) || [];
    const uniqueTeamIds = new Set(validRegistrations.map(r => r.team_id).filter(Boolean));
    const teamCount = uniqueTeamIds.size;

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
        <div className="flex-1 flex flex-col justify-between">
            <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-sm flex flex-col items-center justify-center text-center space-y-2 mb-8">
                <Users className="w-6 h-6 text-blue-500" />
                <h4 className="text-blue-500 font-black uppercase text-sm tracking-widest">Free Agent Status</h4>
                <p className="text-white/70 text-xs">You are registered as a Free Agent. Pending team placement by league admins.</p>
            </div>
            <div className="mt-auto">
                <button
                    onClick={() => router.push(`/rolling-leagues/${league.id}`)}
                    className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.15)] rounded-sm group/btn min-h-[44px]"
                >
                    Free Agent Dashboard <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );

    const renderPlayerOrCaptainView = () => (
        <div className="flex-1 flex flex-col justify-between">
            {loadingStats ? (
                <div className="grid grid-cols-3 gap-3 mb-8 animate-pulse">
                    <div className="bg-white/5 h-20 rounded-sm border border-white/5"></div>
                    <div className="bg-white/5 h-20 rounded-sm border border-white/5"></div>
                    <div className="bg-white/5 h-20 rounded-sm border border-white/5"></div>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-blue-600/10 p-3 rounded-sm border border-blue-600/20">
                        <div className="text-[8px] text-blue-500 font-black uppercase mb-1 tracking-widest flex items-center gap-1">
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
                        className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.15)] rounded-sm group/btn min-h-[44px]"
                    >
                        Captain&apos;s Command Center <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                ) : (
                    <button
                        onClick={() => router.push(`/rolling-leagues/${league.id}`)}
                        className="w-full py-5 bg-transparent border border-white/20 text-white font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all transform active:scale-95 flex items-center justify-center gap-2 rounded-sm group/btn"
                    >
                        Team Hub <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                )}
            </div>
        </div>
    );

    const renderUnregisteredView = () => (
        <div className="flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                    <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-blue-500 transition-colors flex items-center gap-1">
                        <Users className="w-4 h-4" /> Teams
                    </div>
                    <div className="text-white font-bold text-xs uppercase">{teamCount} / {league.max_teams || '∞'}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                    <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-blue-500 transition-colors flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Match
                    </div>
                    <div className="text-white font-bold text-xs uppercase">{league.half_length ? `${league.half_length * 2} minutes` : (league.total_game_time ? `${league.total_game_time} minutes` : 'TBD')}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                    <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-blue-500 transition-colors flex items-center gap-1">
                        <Trophy className="w-4 h-4" /> Prize
                    </div>
                    <div className="text-blue-500 font-black text-xs uppercase truncate">{getPrizeDisplay()}</div>
                </div>
            </div>

            <div className="mt-auto">
                <button
                    onClick={() => router.push(`/rolling-leagues/${league.id}`)}
                    className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.15)] rounded-sm group/btn min-h-[44px]"
                >
                    Explore Details <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );

    return (
        <div className={cn(
            "bg-pitch-card border rounded-sm p-6 shadow-2xl transition-all group overflow-hidden relative flex flex-col h-full",
            isBanned 
                ? "border-red-500/50 hover:border-red-500/80"
                : "border-white/5 hover:border-blue-600/20"
        )}>
            {/* Glossy Overlay Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            {/* Status Indicator Bar */}
            <div className={cn(
                "absolute top-0 left-0 w-1 h-full transition-opacity z-20",
                isBanned ? "bg-red-500 opacity-100" : "bg-blue-600 opacity-50 group-hover:opacity-100"
            )} />
            
            <div className="relative z-10 flex flex-col h-full">
                {/* Header / Title Area */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-blue-600/10 border border-blue-600/20 px-2 py-0.5 rounded-sm flex items-center justify-center">
                                <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest whitespace-nowrap">Rolling League</span>
                            </div>
                            {isBanned && (
                                <span className="px-3 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm animate-pulse">
                                    Suspended
                                </span>
                            )}
                        </div>
                        
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-[0.85] mb-4 font-sans break-words overflow-hidden">
                            {title}
                        </h2>
                        
                        <div className="flex flex-col gap-2 text-pitch-secondary text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-blue-500" />
                                {formatDate(startTime)} - {formatDate(league.end_date || league.end_time || null)}
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-blue-500" />
                                {league.location_nickname || league.location?.split(',')[0] || 'TBD'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inner Views */}
                <div className="flex-1 flex flex-col">
                    {isBanned ? renderBannedView() : 
                     userTeamId ? renderPlayerOrCaptainView() :
                     userReg ? renderFreeAgentView() :
                     renderUnregisteredView()}
                </div>
            </div>
        </div>
    );
}
