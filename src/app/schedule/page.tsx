
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MapPin, Clock, ArrowRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

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
                                    {dailyGames.map((game) => {
                                        const isFull = game.current_players >= game.max_players;
                                        const spotsLeft = game.max_players - game.current_players;

                                        return (
                                            <div
                                                key={game.id}
                                                className="group relative bg-pitch-card hover:bg-white/5 border border-white/5 rounded-sm p-4 md:p-6 transition-all duration-300 flex flex-col md:flex-row md:items-center gap-4 md:gap-8"
                                            >
                                                {/* Time Column */}
                                                <div className="flex-shrink-0 w-24">
                                                    <div className="font-heading text-2xl font-bold italic text-white">
                                                        {formatTime(game.start_time)}
                                                    </div>
                                                    <div className="text-xs text-pitch-secondary uppercase font-bold tracking-wider mt-1">
                                                        Start
                                                    </div>
                                                </div>

                                                {/* Details Column */}
                                                <div className="flex-grow">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-lg text-white group-hover:text-pitch-accent transition-colors">
                                                            {game.title}
                                                        </h3>
                                                        {game.price === 0 && (
                                                            <span className="bg-green-500/20 text-green-400 text-[10px] font-black uppercase px-2 py-0.5 rounded">Free</span>
                                                        )}
                                                    </div>

                                                    <div className="flex item-center text-pitch-secondary text-sm">
                                                        <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                                                        {game.location}
                                                    </div>
                                                </div>

                                                {/* Info Column (Spots/Price) */}
                                                <div className="flex items-center gap-6 text-right justify-between md:justify-end border-t border-white/5 pt-4 md:pt-0 md:border-t-0 w-full md:w-auto mt-2 md:mt-0">
                                                    <div className="flex flex-col items-end">
                                                        <div className={cn(
                                                            "font-bold text-sm",
                                                            isFull ? "text-red-500" : (spotsLeft <= 3 ? "text-orange-400" : "text-green-400")
                                                        )}>
                                                            {isFull ? "FULL" : `${spotsLeft} spots left`}
                                                        </div>
                                                        <div className="text-xs text-pitch-secondary uppercase font-bold">
                                                            {game.price > 0 ? `$${game.price}` : 'No Cost'}
                                                        </div>
                                                    </div>

                                                    <Link
                                                        href={`/games/${game.id}`}
                                                        className={cn(
                                                            "inline-flex items-center justify-center px-6 py-2 rounded-sm font-black uppercase tracking-wider text-sm transition-all shadow-lg",
                                                            isFull
                                                                ? "bg-pitch-card border border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
                                                                : "bg-pitch-accent text-pitch-black hover:bg-white hover:scale-105"
                                                        )}
                                                    >
                                                        {isFull ? 'Join Waitlist' : 'Join Game'}
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
