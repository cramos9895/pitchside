
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Users, Calendar, MapPin, Edit, Filter, XCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

// Define the shape of the game data we need
interface Game {
    id: string;
    title: string;
    location: string;
    start_time: string;
    end_time: string | null;
    current_players: number;
    max_players: number;
    status: string; // 'scheduled' | 'active' | 'completed' | 'cancelled'
    refund_processed: boolean;
}

interface AdminGameListProps {
    initialGames: Game[];
}

export function AdminGameList({ initialGames }: AdminGameListProps) {
    const [games, setGames] = useState<Game[]>(initialGames);
    const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'past' | 'cancelled'>('active');
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [gameToCancel, setGameToCancel] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();
    const toast = useToast();

    // Persist Tab State
    useEffect(() => {
        const savedTab = localStorage.getItem('admin_active_tab');
        if (savedTab && ['active', 'upcoming', 'past', 'cancelled'].includes(savedTab)) {
            setActiveTab(savedTab as any);
        }
    }, []);

    const handleTabChange = (tab: 'active' | 'upcoming' | 'past' | 'cancelled') => {
        setActiveTab(tab);
        localStorage.setItem('admin_active_tab', tab);
    };

    const openCancelModal = (gameId: string) => {
        setGameToCancel(gameId);
        setIsCancelModalOpen(true);
    };

    const handleCancelConfirm = async () => {
        if (!gameToCancel) return;

        try {
            const { error } = await supabase
                .from('games')
                .update({ status: 'cancelled' })
                .eq('id', gameToCancel);

            if (error) {
                console.error('Supabase Update Error:', error);
                throw error;
            }

            // Immediate UI Update
            setGames(prev => prev.map(g => g.id === gameToCancel ? { ...g, status: 'cancelled' } : g));
            toast.success('Event cancelled successfully.');
            router.refresh(); // Sync server state in background
        } catch (error) {
            console.error('Error canceling game:', error);
            toast.error('Failed to cancel event.');
        } finally {
            setIsCancelModalOpen(false);
            setGameToCancel(null);
        }
    };

    // Filter & Sort Logic
    // Filter & Sort Logic
    const filteredGames = games.filter(game => {
        const gameDate = new Date(game.start_time);

        // Fix: Safe Parse End Time
        let endTime: Date;
        if (game.end_time) {
            if (game.end_time.includes('T') || game.end_time.includes('-')) {
                endTime = new Date(game.end_time);
            } else {
                // Handle Time String "HH:mm:ss"
                const [h, m] = game.end_time.split(':').map(Number);
                endTime = new Date(gameDate);
                endTime.setHours(h);
                endTime.setMinutes(m);
                if (endTime < gameDate) endTime.setDate(endTime.getDate() + 1); // Overflow next day
            }
        } else {
            endTime = new Date(gameDate.getTime() + 90 * 60000);
        }

        const now = new Date();
        const isToday = gameDate.toDateString() === now.toDateString();

        // Fix: Sort "Completed" immediately to Past
        const isPast = game.status === 'completed' || (now > endTime);

        // Active: Must NOT be past
        const isActiveOrUpcomingToday = !isPast && (game.status === 'active' || game.status === 'scheduled') && isToday;
        const isFutureUpcoming = !isPast && game.status === 'scheduled' && gameDate > now && !isToday;

        if (activeTab === 'cancelled') return game.status === 'cancelled';
        if (game.status === 'cancelled') return false;

        if (activeTab === 'active') {
            return isActiveOrUpcomingToday;
        }
        if (activeTab === 'upcoming') {
            return isFutureUpcoming;
        }
        if (activeTab === 'past') {
            return isPast;
        }
        return false;
    }).sort((a, b) => {
        const dateA = new Date(a.start_time).getTime();
        const dateB = new Date(b.start_time).getTime();

        // Ascending for Active/Upcoming, Descending for Past/Cancelled
        if (activeTab === 'past' || activeTab === 'cancelled') {
            return dateB - dateA;
        }
        return dateA - dateB;
    });

    return (
        <div>
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-1 overflow-x-auto">
                <button
                    onClick={() => handleTabChange('active')}
                    className={cn(
                        "px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-t-sm transition-colors border-b-2",
                        activeTab === 'active' ? "border-pitch-accent text-pitch-accent bg-white/5" : "border-transparent text-gray-500 hover:text-white"
                    )}
                >
                    Today / Active
                </button>
                <button
                    onClick={() => handleTabChange('upcoming')}
                    className={cn(
                        "px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-t-sm transition-colors border-b-2",
                        activeTab === 'upcoming' ? "border-pitch-accent text-pitch-accent bg-white/5" : "border-transparent text-gray-500 hover:text-white"
                    )}
                >
                    Upcoming
                </button>
                <button
                    onClick={() => handleTabChange('past')}
                    className={cn(
                        "px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-t-sm transition-colors border-b-2",
                        activeTab === 'past' ? "border-pitch-accent text-pitch-accent bg-white/5" : "border-transparent text-gray-500 hover:text-white"
                    )}
                >
                    Past
                </button>
                <button
                    onClick={() => handleTabChange('cancelled')}
                    className={cn(
                        "px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-t-sm transition-colors border-b-2 flex items-center gap-2",
                        activeTab === 'cancelled' ? "border-red-500 text-red-500 bg-red-500/5" : "border-transparent text-gray-500 hover:text-red-400"
                    )}
                >
                    Cancelled
                    {games.filter(g => g.status === 'cancelled' && g.refund_processed === false).length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {games.filter(g => g.status === 'cancelled' && g.refund_processed === false).length}
                        </span>
                    )}
                </button>
            </div>

            {/* Games List */}
            <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
                {filteredGames.length === 0 ? (
                    <div className="text-center py-20 border border-white/5 rounded-sm bg-pitch-card">
                        <Filter className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-pitch-secondary text-lg">No games found in this category.</p>
                    </div>
                ) : (
                    filteredGames.map((game) => {
                        const gameDate = new Date(game.start_time);

                        // Safe Parse End Time & Duration
                        let endTime: Date;
                        if (game.end_time) {
                            if (game.end_time.includes('T') || game.end_time.includes('-')) {
                                endTime = new Date(game.end_time);
                            } else {
                                const [h, m] = game.end_time.split(':').map(Number);
                                endTime = new Date(gameDate);
                                endTime.setHours(h);
                                endTime.setMinutes(m);
                                if (endTime < gameDate) endTime.setDate(endTime.getDate() + 1);
                            }
                        } else {
                            endTime = new Date(gameDate.getTime() + 90 * 60000);
                        }

                        // Calculate Duration (Fix: 60m bug)
                        // Make sure we are diffing timestamps
                        const diffMs = endTime.getTime() - gameDate.getTime();
                        const diffMins = Math.floor(diffMs / 60000); // 90.5 -> 90

                        const hours = Math.floor(diffMins / 60);
                        const mins = diffMins % 60;
                        const durationStr = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

                        const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        const startTimeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        const endTimeStr = endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                        const isCancelled = game.status === 'cancelled';
                        const isCompleted = game.status === 'completed';

                        // Refund Status Logic
                        const isRefundPending = isCancelled && game.refund_processed === false;
                        const isRefundComplete = isCancelled && game.refund_processed === true;

                        return (
                            <div key={game.id} className={cn(
                                "group border p-6 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors",
                                isRefundPending ? "bg-red-950/20 border-red-500/20 opacity-100" :
                                    isRefundComplete ? "bg-pitch-card border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" :
                                        "bg-pitch-card border-white/5 hover:border-pitch-accent/30"
                            )}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className={cn("font-heading text-2xl font-bold italic", isCancelled ? "text-red-400 line-through" : "text-white")}>
                                            {game.title}
                                        </h3>
                                        {isCompleted && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold uppercase rounded">Completed</span>}
                                        {isRefundPending && <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold uppercase rounded flex items-center gap-1 shadow-sm border border-red-500">Refund Needed</span>}
                                        {isRefundComplete && <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs font-bold uppercase rounded flex items-center gap-1">Refunded</span>}
                                        {game.status === 'active' && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs font-bold uppercase rounded animate-pulse">Live Now</span>}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-pitch-secondary text-sm font-medium">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4 text-pitch-accent" /> {dateStr} • {startTimeStr} - {endTimeStr} ({durationStr})
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-4 h-4 text-pitch-accent" /> {game.current_players} / {game.max_players}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4 text-pitch-accent" /> {game.location}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Manage Roster Button */}
                                    <Link
                                        href={`/admin/games/${game.id}`}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 border font-bold uppercase text-sm tracking-wider transition-all rounded-sm",
                                            isRefundPending
                                                ? "bg-transparent border-red-500 text-red-500 hover:bg-red-500/10"
                                                : isRefundComplete
                                                    ? "bg-transparent border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-300"
                                                    : isCompleted
                                                        ? "bg-gray-800 border-gray-700 text-gray-400 hover:bg-white/10 hover:text-white"
                                                        : "bg-white/5 border-white/10 text-white hover:bg-pitch-accent hover:text-pitch-black hover:border-pitch-accent"
                                        )}
                                    >
                                        <Users className="w-4 h-4" />
                                        {isRefundPending ? "Process Refund" : isRefundComplete ? "View" : isCompleted ? "Summary" : "Manage"}
                                    </Link>

                                    {/* Edit Placeholder */}
                                    {!isCancelled && !isCompleted && (
                                        <>
                                            <button
                                                onClick={() => openCancelModal(game.id)}
                                                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                                title="Cancel Event"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={handleCancelConfirm}
                title="Cancel Event?"
                message="Are you sure you want to cancel this event? This action will notify all players and cannot be undone."
                confirmText="Yes, Cancel Event"
                isDestructive={true}
            />
        </div>
    );
}
