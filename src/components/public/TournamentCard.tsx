'use client';

import { Calendar, Users, Trophy, ArrowRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Game {
    id: string;
    title: string;
    location: string;
    location_nickname?: string;
    start_time: string;
    end_time: string | null;
    team_price: number | null;
    free_agent_price: number | null;
    max_teams: number | null;
    prize_pool_percentage: number | null;
    fixed_prize_amount: number | null;
    reward: string | null;
    prize_type: string | null;
    tournament_style: string | null;
}

interface TournamentRegistration {
    user_id: string;
    team_id: string | null;
    role: string;
}

interface TournamentCardProps {
    tournament: Game;
    userId?: string;
    registrations?: TournamentRegistration[];
}

export function TournamentCard({ tournament, userId, registrations }: TournamentCardProps) {
    const router = useRouter();

    const userReg = userId ? registrations?.find(r => r.user_id === userId) : null;
    const userRole = userReg?.role;
    const userTeamId = userReg?.team_id;

    const formatDate = (dateString: string) => {
        if (!dateString) return 'TBD';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const getPrizeDisplay = () => {
        if (!tournament.prize_type || tournament.prize_type === 'No Official Prize') return 'Bragging Rights';
        if (tournament.prize_type === 'Percentage Pool (Scaling Pot)') {
            return `${tournament.prize_pool_percentage || 0}% Pool`;
        }
        if (tournament.prize_type === 'Fixed Cash Bounty') {
            return `$${tournament.fixed_prize_amount || 0} Bounty`;
        }
        if (tournament.prize_type === 'Physical Item') {
            return tournament.reward || 'Trophy';
        }
        return 'TBD';
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
                            {tournament.title}
                        </h2>
                        <div className="flex flex-col gap-1 text-pitch-secondary text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-pitch-accent" />
                                {formatDate(tournament.start_time)} @ {formatTime(tournament.start_time)}
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-pitch-accent" />
                                {tournament.location_nickname || tournament.location.split(',')[0]}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Matrix */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-white/5 p-4 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Prize
                        </div>
                        <div className="text-pitch-accent font-black text-xs uppercase">{getPrizeDisplay()}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors">Style</div>
                        <div className="text-white font-bold text-xs uppercase">{tournament.tournament_style?.replace('_', ' ') || 'Tournament'}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                            <Users className="w-3 h-3" /> Max Teams
                        </div>
                        <div className="text-white font-bold text-sm uppercase">{tournament.max_teams ? `${tournament.max_teams} Teams` : 'TBD'}</div>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                    {userRole === 'captain' && userTeamId ? (
                        <button
                            onClick={() => router.push(`/tournaments/${tournament.id}/team/${userTeamId}`)}
                            className="col-span-1 sm:col-span-2 w-full py-4 bg-[#cbff00] text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.15)] rounded-sm group/btn"
                        >
                            Captain's Command Center <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : userRole ? (
                        <button
                            onClick={() => {
                                const tournamentId = tournament.id || (userReg as any).game_id;
                                router.push(`/dashboard/tournaments/${tournamentId}`);
                            }}
                            className="col-span-1 sm:col-span-2 w-full py-4 bg-white/10 text-white border border-white/20 font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 rounded-sm group/btn"
                        >
                            View Player Dashboard <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => router.push(`/tournaments/${tournament.id}/register?type=team`)}
                                className="w-full py-4 bg-[#cbff00] text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 group/btn shadow-[0_0_20px_rgba(204,255,0,0.15)] rounded-sm"
                            >
                                <span className="flex items-center gap-2">Register Team <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" /></span>
                                {tournament.team_price !== null && <span className="text-[10px] opacity-70">(${tournament.team_price})</span>}
                            </button>
                            {(tournament.free_agent_price !== null && tournament.free_agent_price >= 0) && (
                                <button
                                    onClick={() => router.push(`/tournaments/${tournament.id}/register?type=free_agent`)}
                                    className="w-full py-4 border border-[#cbff00]/50 text-[#cbff00] font-black uppercase tracking-widest text-xs hover:bg-[#cbff00]/10 transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 rounded-sm"
                                >
                                    <span>Join Free Agent</span>
                                    <span className="text-[10px] opacity-70">(${tournament.free_agent_price})</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
