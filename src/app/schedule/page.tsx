
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MapPin, Clock, ArrowRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameCard } from '@/components/GameCard';

interface Game {
    id: string;
    title: string;
    location: string;
    start_time: string;
    end_time: string | null;
    price: number;
    max_players: number;
    current_players: number;
    surface_type: string;
    facility_id?: string | null;
    resource_id?: string | null;
    status: string;
}

export const revalidate = 0; // Ensure fresh data

// Helper to format date for grouping header
const formatDateHeader = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

// Helper to format time
const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default async function SchedulePage() {
    const supabase = await createClient();

    // Fetch user bookings to check status
    const { data: { user } } = await supabase.auth.getUser();
    const bookingStatusMap = new Map<string, string>();

    if (user) {
        const { data: bookings } = await supabase
            .from('bookings')
            .select('game_id, status')
            .eq('user_id', user.id)
            .neq('status', 'cancelled');

        if (bookings) {
            bookings.forEach((b: any) => {
                bookingStatusMap.set(b.game_id, b.status);
            });
        }
    }

    // Fetch all upcoming games
    const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .neq('status', 'cancelled')
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

    if (error) {
        console.error("Error fetching schedule:", error);
    }

    // Group games by date
    const groupedGames: Record<string, Game[]> = {};
    if (games) {
        games.forEach(game => {
            const dateKey = formatDateHeader(game.start_time);
            if (!groupedGames[dateKey]) {
                groupedGames[dateKey] = [];
            }
            groupedGames[dateKey].push(game);
        });
    }

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pt-32 px-4 pb-20">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-6">
                    <h1 className="font-heading text-4xl md:text-6xl font-bold uppercase italic tracking-tighter">
                        Full <span className="text-pitch-accent">Schedule</span>
                    </h1>
                    <Link href="/" className="flex items-center text-pitch-secondary hover:text-white transition-colors text-sm font-bold uppercase tracking-wider">
                        Back to Home
                    </Link>
                </div>

                {!games || games.length === 0 ? (
                    <div className="text-center py-20 border border-white/5 rounded-sm bg-pitch-card">
                        <Calendar className="w-12 h-12 text-pitch-secondary mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">No Upcoming Games</h2>
                        <p className="text-pitch-secondary">Check back later for new matches.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(groupedGames).map(([date, dailyGames]) => (
                            <div key={date} className="relative">
                                {/* Sticky Date Header */}
                                <div className="sticky top-24 z-20 bg-pitch-black/95 backdrop-blur-sm py-4 border-b border-pitch-accent/30 mb-6">
                                    <h2 className="font-heading text-2xl md:text-3xl font-bold uppercase italic text-white flex items-center gap-3">
                                        <span className="w-2 h-8 bg-pitch-accent rounded-sm"></span>
                                        {date}
                                    </h2>
                                </div>

                                {/* Games List */}
                                <div className="space-y-4">
                                    {dailyGames.map((game) => (
                                        <GameCard
                                            key={game.id}
                                            game={game}
                                            user={user}
                                            bookingStatus={bookingStatusMap.get(game.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
