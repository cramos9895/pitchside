
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';
import { GameCard } from '@/components/GameCard';

// Client components don't need revalidate=0, useEffect handles fetching

export default function DashboardPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');
    const [user, setUser] = useState<any>(null);
    const [cancellingGameId, setCancellingGameId] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

    const handleCancel = async () => {
        if (!cancellingGameId) return;

        try {
            const response = await fetch('/api/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: cancellingGameId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            success('Booking cancelled successfully');

            // Remove locally or re-fetch
            setBookings(prev => prev.filter(b => b.game.id !== cancellingGameId));
            setCancellingGameId(null);
            router.refresh(); // Sync server components if any

        } catch (err: any) {
            console.error('Cancel Error:', err);
            toastError(err.message || "Failed to cancel booking");
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push('/login');
                    return;
                }
                setUser(user);
                setUser(user);

                // Fetch bookings with game details
                const { data: bookingsData, error } = await supabase
                    .from('bookings')
                    .select(`
                  *,
                  game:games(*)
                `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error("Error fetching bookings:", error);
                } else {
                    // Filter out cancelled games and lost references (deleted games)
                    const validBookings = (bookingsData || []).filter((b: any) => b.game && b.game.status !== 'cancelled');
                    setBookings(validBookings);
                }
            } catch (err) {
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router, supabase]);

    if (loading) {
        return (
            <div className="min-h-screen bg-pitch-black text-white font-sans pt-32 px-6 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-pitch-accent" />
                    <p className="text-pitch-secondary font-medium tracking-wide">Loading your stats...</p>
                </div>
            </div>
        );
    }

    // Filter Logic
    const filteredBookings = bookings.filter((booking: any) => {
        const game = booking.game;
        if (!game) return false;

        const gameDate = new Date(game.start_time);

        // Calculate End Time (simplified, matches Admin logic)
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

        const now = new Date();
        const isToday = gameDate.toDateString() === now.toDateString();
        const isPast = game.status === 'completed' || (now > endTime);
        const isActiveOrUpcomingToday = !isPast && (game.status === 'active' || game.status === 'scheduled') && isToday;
        const isFutureUpcoming = !isPast && (game.status === 'scheduled' || game.status === 'active') && gameDate > now && !isToday;

        if (activeTab === 'today') return isActiveOrUpcomingToday;
        if (activeTab === 'upcoming') return isFutureUpcoming;
        if (activeTab === 'past') return isPast;
        return false;
    });

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pt-32 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter mb-2">
                            My <span className="text-pitch-accent">Roster</span>
                        </h1>
                        <p className="text-pitch-secondary">
                            Manage your upcoming matches and history.
                        </p>
                    </div>
                    <Link href="/" className="hidden md:flex items-center gap-2 text-pitch-accent font-bold uppercase tracking-wider hover:text-white transition-colors">
                        Find New Games <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-1 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={cn(
                            "px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-t-sm transition-colors border-b-2",
                            activeTab === 'today' ? "border-pitch-accent text-pitch-accent bg-white/5" : "border-transparent text-gray-500 hover:text-white"
                        )}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={cn(
                            "px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-t-sm transition-colors border-b-2",
                            activeTab === 'upcoming' ? "border-pitch-accent text-pitch-accent bg-white/5" : "border-transparent text-gray-500 hover:text-white"
                        )}
                    >
                        Upcoming
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={cn(
                            "px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-t-sm transition-colors border-b-2",
                            activeTab === 'past' ? "border-pitch-accent text-pitch-accent bg-white/5" : "border-transparent text-gray-500 hover:text-white"
                        )}
                    >
                        Past
                    </button>
                </div>

                {!filteredBookings || filteredBookings.length === 0 ? (
                    <div className="text-center py-20 border border-white/5 rounded-sm bg-pitch-card">
                        <h2 className="text-2xl font-bold mb-4">No Matches Found</h2>
                        <p className="text-pitch-secondary mb-8">
                            {activeTab === 'today' ? "You don't have any games today." :
                                activeTab === 'upcoming' ? "No upcoming games scheduled." :
                                    "No past games recorded."}
                        </p>
                        {activeTab !== 'past' && (
                            <Link
                                href="/"
                                className="inline-flex items-center justify-center px-8 py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors"
                            >
                                Join a Game
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                        {filteredBookings.map((booking: any) => {
                            const game = booking.game;
                            if (!game) return null;

                            return (
                                <GameCard
                                    key={booking.id}
                                    game={game}
                                    user={user}
                                    bookingStatus={booking.status} // Pass status to card if needed for visuals
                                // Note: GameCard usually handles 'Join' button.
                                // For Dashboard, we might want 'View Details' or 'Cancel'?
                                // GameCard logic might need checking if it shows 'Joined' correctly.
                                // Assuming GameCard adapts to user being joined.
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={!!cancellingGameId}
                onClose={() => setCancellingGameId(null)}
                onConfirm={handleCancel}
                title="Cancel Booking"
                message="Are you sure you want to cancel your spot? This action cannot be undone."
                confirmText="Yes, Cancel Booking"
                isDestructive={true}
            />
        </div >
    );
}
