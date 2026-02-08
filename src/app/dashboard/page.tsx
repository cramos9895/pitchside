
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

// Client components don't need revalidate=0, useEffect handles fetching

export default function DashboardPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push('/login');
                    return;
                }

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
                    setBookings(bookingsData || []);
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

                {!bookings || bookings.length === 0 ? (
                    <div className="text-center py-20 border border-white/5 rounded-sm bg-pitch-card">
                        <h2 className="text-2xl font-bold mb-4">No Matches Found</h2>
                        <p className="text-pitch-secondary mb-8">You haven't joined any games yet.</p>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center px-8 py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors"
                        >
                            Join a Game
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {bookings?.map((booking: any) => {
                            const game = booking.game;
                            if (!game) return null;

                            const gameDate = new Date(game.start_time);
                            const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                            const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                            const isPast = new Date() > gameDate;

                            return (
                                <div key={booking.id} className={`group relative bg-pitch-card border-l-4 ${isPast ? 'border-gray-600 opacity-60' : 'border-pitch-accent'} p-6 rounded-sm shadow-xl`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-heading text-2xl font-bold italic">{timeStr}</h3>
                                            <p className="text-pitch-secondary text-sm font-bold uppercase">{dateStr}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${isPast ? 'bg-gray-700 text-gray-400' : 'bg-pitch-accent text-pitch-black'}`}>
                                            {isPast ? 'Completed' : 'Upcoming'}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        <h4 className="font-bold text-lg truncate">{game.title}</h4>
                                        <div className="flex items-center text-pitch-secondary">
                                            <MapPin className="w-4 h-4 mr-2 text-pitch-accent" />
                                            <span className="text-sm truncate">{game.location}</span>
                                        </div>
                                        <div className="flex items-center text-pitch-secondary">
                                            <span className="text-xs uppercase bg-white/5 px-2 py-0.5 rounded text-gray-400">
                                                {game.surface_type}
                                            </span>
                                        </div>
                                    </div>

                                    {booking.status === 'paid' && (
                                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-wider">
                                            <span className="w-2 h-2 bg-green-400 rounded-full" />
                                            Confirmed Ticket
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
