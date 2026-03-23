'use client';

import { Calendar, Users, ShieldCheck, MapPin, Edit, Trash2, LayoutList, Zap } from 'lucide-react';
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
    game_format?: string;
}

interface AdminLeagueCardProps {
    game: Game;
    onEdit: (game: Game) => void;
    onCancel: (id: string) => void;
    onHardDelete: (id: string) => void;
}

export function AdminLeagueCard({ game, onEdit, onCancel, onHardDelete }: AdminLeagueCardProps) {
    const gameDate = new Date(game.start_time);
    const dateStr = gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const isCancelled = game.status === 'cancelled';
    const isCompleted = game.status === 'completed';
    const isLive = game.status === 'active';

    return (
        <div className={cn(
            "group bg-pitch-card border border-white/5 rounded-sm p-6 transition-all hover:border-blue-500/20 relative overflow-hidden",
            isCancelled && "opacity-60 grayscale"
        )}>
            {/* Glow Effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            
            <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                isLive ? "bg-yellow-500" : isCompleted ? "bg-green-500" : isCancelled ? "bg-red-500" : "bg-blue-600"
            )} />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                {/* Info Section */}
                <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1">
                            <LayoutList className="w-3 h-3" /> Season League
                        </div>
                        <h3 className={cn("text-2xl font-heading font-bold italic uppercase tracking-tight text-white", isCancelled && "text-gray-500 line-through")}>
                            {game.title}
                        </h3>
                        {isLive && <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded animate-pulse">Season Live</span>}
                        {isCompleted && <span className="bg-green-500/20 text-green-400 text-[10px] font-black px-2 py-0.5 rounded border border-green-500/30">Season Finished</span>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-blue-500" /> Start Date
                            </span>
                            <div className="text-sm font-bold text-white">
                                {dateStr} <br />
                                <span className="text-pitch-secondary text-xs">Registration Open</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <Users className="w-3 h-3 text-blue-500" /> Scale
                            </span>
                            <div className="text-sm font-bold text-white">
                                Multiple Teams <br />
                                <span className="text-pitch-secondary text-xs">Draft & Free Agents</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-blue-500" /> Location
                            </span>
                            <div className="text-sm font-bold text-white truncate max-w-[150px]">
                                {game.location.split(',')[0]} <br />
                                <span className="text-pitch-secondary text-xs italic">League Venue</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-blue-500" /> Format
                            </span>
                            <div className="text-sm font-bold text-white">
                                {game.game_format || 'Season'} <br />
                                <span className="text-pitch-secondary text-xs">Official League</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex items-center gap-3 shrink-0">
                    <Link
                        href={`/admin/games/${game.id}`}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black uppercase text-xs tracking-widest transition-all rounded-sm hover:bg-white hover:text-black shadow-lg shadow-blue-900/20"
                    >
                        <LayoutList className="w-4 h-4" /> Manage League
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
