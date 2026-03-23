'use client';

import { Calendar, Users, Trophy, MapPin, Edit, Trash2, ShieldCheck, LayoutGrid, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Game {
    id: string;
    title: string;
    location: string;
    start_time: string;
    end_time: string | null;
    current_players: number;
    max_players: number;
    price: number;
    surface_type: string;
    status: string;
    refund_processed: boolean;
    tournament_style?: string;
    max_teams?: number;
    current_teams?: number;
    team_price?: number;
    free_agent_price?: number;
    prize_type?: string;
    reward?: string;
    fixed_prize_amount?: number;
}

interface AdminTournamentCardProps {
    game: Game;
    onEdit: (game: Game) => void;
    onCancel: (id: string) => void;
    onHardDelete: (id: string) => void;
}

export function AdminTournamentCard({ game, onEdit, onCancel, onHardDelete }: AdminTournamentCardProps) {
    const gameDate = new Date(game.start_time);
    const dateStr = gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const isCancelled = game.status === 'cancelled';
    const isCompleted = game.status === 'completed';
    const isLive = game.status === 'active';

    const getPrizeDisplay = () => {
        if (game.prize_type === 'Fixed Cash Bounty') return `$${game.fixed_prize_amount}`;
        if (game.prize_type === 'Physical Item') return game.reward || 'Physical Trophy';
        return game.prize_type || 'Bragging Rights';
    };

    return (
        <div className={cn(
            "group bg-pitch-card border border-white/5 rounded-sm p-6 transition-all hover:border-red-500/20 relative overflow-hidden",
            isCancelled && "opacity-60 grayscale"
        )}>
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                isLive ? "bg-yellow-500" : isCompleted ? "bg-green-500" : isCancelled ? "bg-red-500" : "bg-red-600"
            )} />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                {/* Info Section */}
                <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-red-500/10 border border-red-500/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1 text-shadow-glow">
                            <Trophy className="w-3 h-3" /> Tournament
                        </div>
                        <h3 className={cn("text-2xl font-heading font-bold italic uppercase tracking-tight", isCancelled ? "text-gray-500 line-through" : "text-white")}>
                            {game.title}
                        </h3>
                        {isLive && <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded animate-pulse">In Progress</span>}
                        {isCompleted && <span className="bg-green-500/20 text-green-400 text-[10px] font-black px-2 py-0.5 rounded border border-green-500/30">Finished</span>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-red-500" /> Kickoff
                            </span>
                            <div className="text-sm font-bold text-white">
                                {dateStr} <br />
                                <span className="text-pitch-secondary text-xs">{timeStr}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <LayoutGrid className="w-3 h-3 text-red-500" /> Structure
                            </span>
                            <div className="text-sm font-bold text-white">
                                {game.max_teams ? `${game.current_teams || 0}/${game.max_teams} Teams` : 'TBD'} <br />
                                <span className="text-pitch-secondary text-xs capitalize">{game.tournament_style?.replace('_', ' ')}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <Users className="w-3 h-3 text-red-500" /> Players
                            </span>
                            <div className="text-sm font-bold text-white">
                                {game.current_players} Signed Up <br />
                                <span className="text-pitch-secondary text-xs">Total Roster</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-red-500" /> Prize
                            </span>
                            <div className="text-sm font-bold text-pitch-accent">
                                {getPrizeDisplay()} <br />
                                <span className="text-pitch-secondary text-xs">Winner Reward</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex items-center gap-3 shrink-0">
                    <Link
                        href={`/admin/games/${game.id}`}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white font-black uppercase text-xs tracking-widest transition-all rounded-sm hover:bg-white hover:text-black hover:border-white shadow-xl"
                    >
                        <LayoutGrid className="w-4 h-4 text-red-500" /> Manage Tournament
                    </Link>

                    {!isCancelled && !isCompleted && (
                        <>
                            <button
                                onClick={() => onEdit(game)}
                                className="p-3 text-gray-400 hover:text-pitch-accent hover:bg-white/5 rounded-sm transition-all border border-white/5"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => onCancel(game.id)}
                                className="p-3 text-gray-400 hover:text-red-500 hover:bg-white/5 rounded-sm transition-all border border-white/5"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </>
                    )}

                     {(isCompleted || isCancelled) && (
                        <button
                            onClick={() => onHardDelete(game.id)}
                            className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/5 rounded-sm transition-all border border-white/5"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
