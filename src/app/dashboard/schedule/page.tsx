'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, CalendarRange, Clock, MapPin, RefreshCw, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface UnifiedEvent {
    id: string;
    type: 'rental' | 'game';
    title: string;
    subtitle: string;
    startTime: Date;
    endTime: Date;
    statusLabel: string;
    isRecurring: boolean;
    rawGameId?: string; // used for linking to game details
}

export default function DashboardSchedulePage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<UnifiedEvent[]>([]);
    const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('upcoming');

    useEffect(() => {
        const fetchSchedule = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                // 1. Fetch confirmed RENTALS (resource_bookings)
                const { data: rentalsData } = await supabase
                    .from('resource_bookings')
                    .select('*, facility:facilities(name), resource:resources(title)')
                    .eq('user_id', user.id)
                    .eq('status', 'confirmed');

                const myRentals: UnifiedEvent[] = (rentalsData || []).map(r => ({
                    id: `rental-${r.id}`,
                    type: 'rental',
                    title: r.facility?.name || 'Unknown Facility',
                    subtitle: r.resource?.title || 'Unknown Resource',
                    startTime: new Date(r.start_time),
                    endTime: new Date(r.end_time),
                    statusLabel: 'Confirmed Rental',
                    isRecurring: r.recurring_group_id !== null,
                }));

                // 2. Fetch confirmed GAMES (bookings -> games)
                const { data: gamesData } = await supabase
                    .from('bookings')
                    .select(`
                        id,
                        status,
                        roster_status,
                        game:games(
                            id,
                            facility_id,
                            title,
                            start_time,
                            end_time,
                            status,
                            facility:facilities(name)
                        )
                    `)
                    .eq('user_id', user.id);

                const validGames = (gamesData || []).filter((b: any) =>
                    b.game &&
                    b.game.status !== 'cancelled' &&
                    b.status !== 'cancelled' &&
                    b.roster_status !== 'dropped'
                );

                const myGames: UnifiedEvent[] = validGames.map(b => {
                    const g = b.game;
                    const gameDate = new Date(g.start_time);

                    // Same end time calculation logic as page.tsx
                    let endTime: Date;
                    if (g.end_time) {
                        if (g.end_time.includes('T') || g.end_time.includes('-')) {
                            endTime = new Date(g.end_time);
                        } else {
                            const [h, m] = g.end_time.split(':').map(Number);
                            endTime = new Date(gameDate);
                            endTime.setHours(h);
                            endTime.setMinutes(m);
                            if (endTime < gameDate) endTime.setDate(endTime.getDate() + 1);
                        }
                    } else {
                        endTime = new Date(gameDate.getTime() + 90 * 60000);
                    }

                    return {
                        id: `game-${b.id}`,
                        type: 'game',
                        title: g.title || 'Pick-Up Game',
                        subtitle: g.facility?.name || 'Unknown Facility',
                        startTime: gameDate,
                        endTime: endTime,
                        statusLabel: 'Joined Game',
                        isRecurring: false,
                        rawGameId: g.id
                    };
                });

                // 3. Merge and Sort
                const merged = [...myRentals, ...myGames].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
                setEvents(merged);

            } catch (err) {
                console.error("Dashboard Schedule Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, [router, supabase]);

    // Apply Tab Filters
    const filteredEvents = events.filter(evt => {
        const now = new Date();
        const isToday = evt.startTime.toDateString() === now.toDateString();
        const isPast = now > evt.endTime;

        if (activeTab === 'today') return isToday;
        if (activeTab === 'upcoming') return !isPast && !isToday;
        if (activeTab === 'past') return isPast;
        return false;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 className="w-8 h-8 animate-spin text-pitch-accent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold mb-1">My Schedule</h2>
                    <p className="text-pitch-secondary text-sm">Your upcoming games and facility rentals.</p>
                </div>
            </div>

            {/* Tab Filters */}
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-1 overflow-x-auto hide-scrollbar">
                {(['today', 'upcoming', 'past'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-t-sm transition-colors border-b-2 whitespace-nowrap",
                            activeTab === tab
                                ? "border-pitch-accent text-pitch-accent bg-white/5"
                                : "border-transparent text-gray-500 hover:text-white"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {filteredEvents.length === 0 ? (
                <div className="text-center py-16 bg-pitch-card border border-dashed border-white/10 rounded-lg">
                    <CalendarRange className="w-10 h-10 text-pitch-secondary mx-auto mb-3 opacity-50" />
                    <h3 className="font-bold mb-1">No Events Found</h3>
                    <p className="text-pitch-secondary text-sm">
                        {activeTab === 'today' ? "You don't have any games or rentals today." :
                            activeTab === 'upcoming' ? "No upcoming events scheduled." :
                                "No past events recorded."}
                    </p>
                    {activeTab !== 'past' && (
                        <div className="mt-4 flex items-center justify-center gap-4">
                            <Link href="/" className="text-sm font-bold uppercase text-pitch-accent hover:text-white transition-colors">Find a Game</Link>
                            <span className="text-white/20">|</span>
                            <Link href="/facilities" className="text-sm font-bold uppercase text-pitch-accent hover:text-white transition-colors">Rent a Field</Link>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredEvents.map((evt) => {
                        return (
                            <div key={evt.id} className="group flex flex-col sm:flex-row bg-pitch-card border border-white/5 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                                {/* Date Box */}
                                <div className="bg-black/20 border-r border-white/5 p-4 sm:w-32 shrink-0 flex flex-col justify-center items-center text-center">
                                    <span className="text-xs font-bold uppercase tracking-widest text-pitch-accent mb-1">
                                        {evt.startTime.toLocaleDateString(undefined, { month: 'short' })}
                                    </span>
                                    <span className="text-3xl font-black italic tracking-tighter">
                                        {evt.startTime.getDate()}
                                    </span>
                                    <span className="text-xs text-pitch-secondary mt-1 uppercase tracking-wider font-medium">
                                        {evt.startTime.toLocaleDateString(undefined, { weekday: 'short' })}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="p-4 flex-1 flex flex-col justify-center">
                                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                {evt.type === 'game' ? (
                                                    <Trophy className="w-4 h-4 text-pitch-accent" />
                                                ) : (
                                                    <MapPin className="w-4 h-4 text-green-400" />
                                                )}
                                                <h4 className="text-lg font-bold">{evt.title}</h4>
                                            </div>

                                            <div className="flex items-center text-sm text-gray-300 font-medium mt-1">
                                                {evt.type === 'game' ? <MapPin className="w-3.5 h-3.5 mr-2 text-pitch-secondary" /> : <Clock className="w-3.5 h-3.5 mr-2 text-pitch-secondary" />}
                                                {evt.subtitle}
                                            </div>

                                            <div className="flex items-center text-sm text-gray-300 font-medium mt-1">
                                                <Clock className="w-3.5 h-3.5 mr-2 text-pitch-secondary" />
                                                {evt.startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {evt.endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                            </div>
                                        </div>

                                        <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0 flex-wrap">
                                            <span className={cn(
                                                "px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border",
                                                evt.type === 'game'
                                                    ? "bg-pitch-accent/10 text-pitch-accent border-pitch-accent/20"
                                                    : "bg-green-500/10 text-green-400 border-green-500/20"
                                            )}>
                                                {evt.statusLabel}
                                            </span>
                                            {evt.isRecurring && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-pitch-accent px-2 py-1 bg-pitch-accent/10 border border-pitch-accent/20 rounded">
                                                    <RefreshCw className="w-3 h-3" />
                                                    Series
                                                </span>
                                            )}
                                            {evt.type === 'game' && evt.rawGameId && (
                                                <Link
                                                    href={`/games/${evt.rawGameId}`}
                                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors"
                                                >
                                                    View Match
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
