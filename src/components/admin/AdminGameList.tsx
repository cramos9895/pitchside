'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Users, Calendar, MapPin, Edit, Filter, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { GameForm } from '@/components/admin/GameForm';
import { hardDeleteGame } from '@/app/actions/update-game';

import { AdminPickupCard } from './AdminPickupCard';
import { AdminTournamentCard } from './AdminTournamentCard';
import { AdminLeagueCard } from './AdminLeagueCard';

// Extended Game Interface to match DB
interface Game {
    id: string;
    title: string;
    location: string;
    latitude?: number;
    longitude?: number;
    start_time: string;
    end_time: string | null;
    current_players: number;
    max_players: number;
    price: number;
    surface_type: string;
    facility_id?: string | null;
    resource_id?: string | null;
    description?: string;
    teams_config?: any;
    has_mvp_reward?: boolean;
    allowed_payment_methods?: string[];
    status: string; // 'scheduled' | 'active' | 'completed' | 'cancelled'
    refund_processed: boolean;
    event_type?: string;
    game_format?: string;
}

interface AdminGameListProps {
    initialGames: Game[];
}

export function AdminGameList({ initialGames }: AdminGameListProps) {
    const [games, setGames] = useState<Game[]>(initialGames);
    const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'past' | 'cancelled'>('active');
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [gameToCancel, setGameToCancel] = useState<string | null>(null);

    // Hard Delete State
    const [isHardDeleteModalOpen, setIsHardDeleteModalOpen] = useState(false);
    const [gameToHardDelete, setGameToHardDelete] = useState<string | null>(null);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [gameToEdit, setGameToEdit] = useState<Game | null>(null);

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

    // Sync games state when initialGames prop updates (e.g. after router.refresh())
    useEffect(() => {
        setGames(initialGames);
    }, [initialGames]);

    const handleTabChange = (tab: 'active' | 'upcoming' | 'past' | 'cancelled') => {
        setActiveTab(tab);
        localStorage.setItem('admin_active_tab', tab);
    };

    const openCancelModal = (gameId: string) => {
        setGameToCancel(gameId);
        setIsCancelModalOpen(true);
    };

    const openHardDeleteModal = (gameId: string) => {
        setGameToHardDelete(gameId);
        setIsHardDeleteModalOpen(true);
    };

    const openEditModal = (game: Game) => {
        setGameToEdit(game);
        setIsEditModalOpen(true);
    };

    const handleEditSuccess = () => {
        setIsEditModalOpen(false);
        setGameToEdit(null);
        toast.success("Game updated successfully!");
        router.refresh(); // Refresh server data
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

    const handleHardDeleteConfirm = async () => {
        if (!gameToHardDelete) return;

        try {
            await hardDeleteGame(gameToHardDelete);

            // Immediate UI Update
            setGames(prev => prev.filter(g => g.id !== gameToHardDelete));
            toast.success('Game permanently deleted from database.');
            router.refresh();
        } catch (error: any) {
            console.error('Error hard deleting game:', error);
            toast.error(error.message || 'Failed to permanently delete game.');
        } finally {
            setIsHardDeleteModalOpen(false);
            setGameToHardDelete(null);
        }
    };

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
                    Today
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
                        const isTournament = game.event_type === 'tournament';
                        const isLeague = game.event_type === 'league';

                        if (isTournament) {
                            return (
                                <AdminTournamentCard 
                                    key={game.id} 
                                    game={game as any} 
                                    onEdit={openEditModal as any} 
                                    onCancel={openCancelModal} 
                                    onHardDelete={openHardDeleteModal} 
                                />
                            );
                        }

                        if (isLeague) {
                            return (
                                <AdminLeagueCard 
                                    key={game.id} 
                                    game={game as any} 
                                    onEdit={openEditModal as any} 
                                    onCancel={openCancelModal} 
                                    onHardDelete={openHardDeleteModal} 
                                />
                            );
                        }

                        return (
                            <AdminPickupCard 
                                key={game.id} 
                                game={game as any} 
                                onEdit={openEditModal as any} 
                                onCancel={openCancelModal} 
                                onHardDelete={openHardDeleteModal} 
                            />
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

            {/* Hard Delete Modal */}
            <ConfirmationModal
                isOpen={isHardDeleteModalOpen}
                onClose={() => setIsHardDeleteModalOpen(false)}
                onConfirm={handleHardDeleteConfirm}
                title="Permanently Delete Game?"
                message="WARNING: This will completely wipe the game, roster, and waitlist from the database. It will not trigger refunds. Use this only for cleaning up test data. This cannot be undone."
                confirmText="Yes, Wipe Game"
                isDestructive={true}
            />

            {/* Edit Modal (Inline for now) */}
            {isEditModalOpen && gameToEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
                    <div className="relative bg-pitch-black border border-white/10 rounded-sm shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in-95">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-heading font-bold uppercase italic text-white mb-6">Edit <span className="text-pitch-accent">Game</span></h2>
                        <GameForm initialData={gameToEdit} action="edit" onSuccess={handleEditSuccess} />
                    </div>
                </div>
            )}
        </div>
    );
}
