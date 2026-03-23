'use client';

import { Calendar, Users, MapPin, Edit, Trash2, Clock, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Game {
    id: string;
    title: string;
    location: string;
    location_nickname: string | null;
    start_time: string;
    end_time: string | null;
    current_players: number;
    max_players: number;
    price: number;
    surface_type: string;
    match_style?: string;
    status: string;
    refund_processed: boolean;
}

interface AdminPickupCardProps {
    game: Game;
    onEdit: (game: Game) => void;
    onCancel: (id: string) => void;
    onHardDelete: (id: string) => void;
}

export function AdminPickupCard({ game, onEdit, onCancel, onHardDelete }: AdminPickupCardProps) {
    const gameDate = new Date(game.start_time);
    
    // Duration Logic
    let endDate: Date;
    if (game.end_time) {
        if (game.end_time.includes('T') || game.end_time.includes('-')) {
            endDate = new Date(game.end_time);
        } else {
            const [h, m] = game.end_time.split(':').map(Number);
            endDate = new Date(gameDate);
            endDate.setHours(h);
            endDate.setMinutes(m);
            if (endDate < gameDate) endDate.setDate(endDate.getDate() + 1);
        }
    } else {
        endDate = new Date(gameDate.getTime() + 90 * 60000);
    }

    const durationMins = Math.round((endDate.getTime() - gameDate.getTime()) / 60000);
    const durationStr = durationMins > 60 
        ? `${Math.floor(durationMins / 60)}h ${durationMins % 60 > 0 ? `${durationMins % 60}m` : ''}` 
        : `${durationMins}m`;

    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeRangeStr = `${gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

    const isCancelled = game.status === 'cancelled';
    const isCompleted = game.status === 'completed';
    const isLive = game.status === 'active';
    const isRefundPending = isCancelled && !game.refund_processed;

    return (
        <div className={cn(
            "group bg-pitch-card border border-white/5 rounded-sm p-6 transition-all hover:border-pitch-accent/20 relative overflow-hidden",
            isCancelled && "opacity-60 grayscale",
            isRefundPending && "border-red-500/30 bg-red-500/5 opacity-100 grayscale-0"
        )}>
            {/* Status Indicator Bar */}
            <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                isLive ? "bg-yellow-500" : isCompleted ? "bg-green-500" : isCancelled ? "bg-red-500" : "bg-pitch-accent"
            )} />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Info Section */}
                <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest text-pitch-secondary flex items-center gap-1">
                            <Zap className="w-3 h-3 text-pitch-accent" /> Pickup Match
                        </div>
                        <h3 className={cn("text-2xl font-heading font-bold italic uppercase tracking-tight", isCancelled ? "text-gray-500 line-through" : "text-white")}>
                            {game.title}
                        </h3>
                        {isLive && <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded animate-pulse">Live Now</span>}
                        {isCompleted && <span className="bg-green-500/20 text-green-400 text-[10px] font-black px-2 py-0.5 rounded border border-green-500/30">Completed</span>}
                        {isRefundPending && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg">Refund Needed</span>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-pitch-accent" /> Date & Time
                            </span>
                            <div className="text-sm font-bold text-white">
                                {dateStr} <br />
                                <span className="text-pitch-secondary text-xs">{timeRangeStr}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <Users className="w-3 h-3 text-pitch-accent" /> Roster
                            </span>
                            <div className="text-sm font-bold text-white">
                                {game.current_players} / {game.max_players} <br />
                                <span className="text-pitch-secondary text-xs">{game.max_players - game.current_players} Spots Left</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-pitch-accent" /> Location
                            </span>
                            <div className="text-sm font-bold text-white truncate max-w-[150px]">
                                {game.location_nickname || game.location.split(',')[0]} <br />
                                <span className="text-pitch-secondary text-xs italic">{game.surface_type}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <Clock className="w-3 h-3 text-pitch-accent" /> Format
                            </span>
                            <div className="text-sm font-bold text-white">
                                {game.match_style || 'Match'} <br />
                                <span className="text-pitch-secondary text-xs">{durationStr} Duration</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex items-center gap-3 shrink-0">
                    <Link
                        href={`/admin/games/${game.id}`}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 font-black uppercase text-xs tracking-widest transition-all rounded-sm",
                            isRefundPending ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20" :
                            isCompleted ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5" :
                            "bg-pitch-accent text-pitch-black hover:bg-white shadow-lg shadow-pitch-accent/10"
                        )}
                    >
                        {isRefundPending ? "Process Refund" : isCompleted ? "View Summary" : "Manage Pickup Event"}
                    </Link>

                    {!isCancelled && !isCompleted && (
                        <>
                            <button
                                onClick={() => onEdit(game)}
                                className="p-3 text-gray-400 hover:text-pitch-accent hover:bg-white/5 rounded-sm transition-all border border-white/5"
                                title="Edit Match"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => onCancel(game.id)}
                                className="p-3 text-gray-400 hover:text-red-500 hover:bg-white/5 rounded-sm transition-all border border-white/5"
                                title="Cancel Match"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    {(isCompleted || isCancelled) && (
                        <button
                            onClick={() => onHardDelete(game.id)}
                            className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/5 rounded-sm transition-all border border-white/5"
                            title="Hard Delete (Wipe DB)"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
