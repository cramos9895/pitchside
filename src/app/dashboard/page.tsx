'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, MapPin, AlertCircle, Loader2, User, Trophy, Users, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { TournamentCard } from '@/components/public/TournamentCard';
import { GameCard } from '@/components/GameCard';
import { createContractCheckoutSession } from '@/app/actions/stripe';

export default function DashboardOverviewPage() {
    const supabase = createClient();
    const router = useRouter();
    const { success, error: toastError } = useToast();

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [unifiedEvents, setUnifiedEvents] = useState<any[]>([]);
    const [actionRequiredRentals, setActionRequiredRentals] = useState<any[]>([]);
    const [isPayingContract, setIsPayingContract] = useState<string | null>(null);

    useEffect(() => {
        const fetchOverviewData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }
                setUser(user);

                const now = new Date().toISOString();

                // 1. Fetch Action Required Rentals
                const { data: pendingBookings } = await supabase
                    .from('resource_bookings')
                    .select('*, facility:facilities(name), resource:resources(title)')
                    .eq('user_id', user.id)
                    .eq('status', 'awaiting_payment')
                    .order('start_time', { ascending: true });

                if (pendingBookings) {
                    const grouped = pendingBookings.reduce((acc: any, booking: any) => {
                        const key = booking.recurring_group_id || booking.id;
                        if (!acc[key]) {
                            acc[key] = {
                                group_id: key,
                                facility: booking.facility?.name || 'Unknown Facility',
                                resource: booking.resource?.title || 'Unknown Resource',
                                bookings: [],
                            };
                        }
                        acc[key].bookings.push(booking);
                        return acc;
                    }, {});

                    const groupIds = Object.keys(grouped);
                    if (groupIds.length > 0) {
                        const { data: contractsData } = await supabase
                            .from('recurring_booking_groups')
                            .select('*')
                            .in('id', groupIds);

                        if (contractsData) {
                            contractsData.forEach(c => {
                                if (grouped[c.id]) grouped[c.id].contract = c;
                            });
                        }
                    }
                    setActionRequiredRentals(Object.values(grouped));
                }

                // 2. Fetch All Event Types
                const [rentalsRes, gamesRes, tournamentsRes] = await Promise.all([
                    supabase
                        .from('resource_bookings')
                        .select('*, facility:facilities(name), resource:resources(title)')
                        .eq('user_id', user.id)
                        .eq('status', 'confirmed')
                        .gte('start_time', now)
                        .order('start_time', { ascending: true }),
                    supabase
                        .from('bookings')
                        .select('id, game:games(id, start_time, end_time, title, facility:facilities(name), max_players, current_players, match_style, game_format, location, location_nickname)')
                        .eq('user_id', user.id)
                        .in('status', ['paid', 'confirmed'])
                        .not('roster_status', 'eq', 'dropped'),
                    supabase
                        .from('tournament_registrations')
                        .select('*, games(*), teams(id, name)')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                ]);

                // 3. Normalize into Unified Feed
                const events: any[] = [];

                // Add Rentals
                if (rentalsRes.data) {
                    rentalsRes.data.forEach(r => events.push({
                        type: 'rental',
                        id: r.id,
                        start_time: r.start_time,
                        end_time: r.end_time,
                        title: r.facility?.name || 'Rental',
                        location: r.resource?.title,
                        data: r
                    }));
                }

                // Add Pickup Games
                if (gamesRes.data) {
                    (gamesRes.data as any[]).forEach(b => {
                        const g = b.game as any;
                        if (g && new Date(g.start_time).toISOString() >= now) {
                            events.push({
                                type: 'game',
                                id: b.id,
                                start_time: g.start_time,
                                end_time: g.end_time,
                                title: g.title || 'Pick-Up Game',
                                location: g.facility?.name,
                                location_nickname: g.location_nickname,
                                data: g
                            });
                        }
                    });
                }

                // Add Tournaments
                if (tournamentsRes.data) {
                    tournamentsRes.data.forEach(reg => {
                        if (reg.games && new Date(reg.games.start_time).toISOString() >= now) {
                            // Extract all registrations for this specific game if needed, 
                            // but for now we pass the user's specific registration as the primary 
                            // and wrap it in an array for the TournamentCard's expectation.
                            events.push({
                                type: 'tournament',
                                id: reg.id,
                                start_time: reg.games.start_time,
                                end_time: reg.games.end_time,
                                title: reg.games.title || 'Tournament',
                                location: reg.games.location_nickname,
                                data: reg.games,
                                registration: reg,
                                registrations: [reg] // Restoring the array for the card logic
                            });
                        }
                    });
                }

                // Sort Chronologically
                events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                setUnifiedEvents(events);

            } catch (err) {
                console.error("Dashboard Overview Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOverviewData();
    }, [router, supabase]);

    const handlePayContract = async (groupId: string) => {
        setIsPayingContract(groupId);
        try {
            const result = await createContractCheckoutSession(groupId);
            if (result.error) {
                toastError(result.error);
            } else if (result.url) {
                window.location.href = result.url;
            }
        } catch (err) {
            toastError("Failed to initiate payment.");
        } finally {
            setIsPayingContract(null);
        }
    };

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(cents / 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 className="w-8 h-8 animate-spin text-pitch-accent" />
            </div>
        );
    }

    const nextUp = unifiedEvents[0];
    const schedule = unifiedEvents; // Show ALL events in the schedule tab, including the one in Next Up

    const getMatchHref = (event: any) => {
        if (event.type === 'game') return `/games/${event.data.id}`;
        if (event.type === 'tournament') {
            const isCaptain = event.registration?.role === 'captain';
            const teamId = event.registration?.team_id;
            const tournamentId = event.data?.id || event.registration?.game_id;
            
            if (isCaptain && teamId) {
                return `/tournaments/${tournamentId}/team/${teamId}`;
            }
            return `/dashboard/tournaments/${tournamentId}`;
        }
        return '/profile';
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700 text-white pt-2 relative">
            {/* Ambient Background */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(204,255,0,0.03)_0%,transparent_50%)] pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5 relative z-10">
                <div className="space-y-1">
                    <h2 className="text-4xl md:text-6xl font-black italic uppercase italic tracking-tighter leading-none">
                        PLAYER <span className="text-pitch-accent">HUB</span>
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-pitch-secondary pl-1">
                        Control Center / {user?.email?.split('@')[0] || 'Member'}
                    </p>
                </div>
                <Link href="/profile" className="group flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-sm hover:bg-pitch-accent hover:border-pitch-accent transition-all shrink-0">
                    <div className="w-8 h-8 rounded-full bg-pitch-accent/20 flex items-center justify-center group-hover:bg-pitch-black/20 transition-colors">
                        <User className="w-4 h-4 text-pitch-accent group-hover:text-pitch-black" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white group-hover:text-pitch-black">View Profile</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
                {/* Main Content: Next Up & Schedule */}
                <div className="lg:col-span-8 space-y-12">
                    
                    {/* NEXT UP SECTION */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-pitch-secondary shrink-0">Next Up</h3>
                            <div className="h-px w-full bg-white/5" />
                        </div>

                        {nextUp ? (
                            nextUp.type === 'tournament' ? (
                                <TournamentCard 
                                    tournament={nextUp.data} 
                                    userId={user?.id}
                                    registrations={nextUp.registrations}
                                />
                            ) : (
                                <div className="max-w-xl">
                                    <GameCard 
                                        game={{
                                            ...nextUp.data,
                                            location_name: nextUp.location,
                                            location_nickname: nextUp.location_nickname
                                        }} 
                                        user={user}
                                        bookingStatus="confirmed"
                                    />
                                </div>
                            )
                        ) : (
                            <div className="bg-[#111] border border-dashed border-white/10 rounded-sm p-16 text-center">
                                <Calendar className="w-12 h-12 text-pitch-secondary mx-auto mb-6 opacity-20" />
                                <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Clean Sheet</h4>
                                <p className="text-xs text-pitch-secondary uppercase tracking-widest mb-8">No upcoming games scheduled</p>
                                <div className="flex flex-wrap items-center justify-center gap-4">
                                    <Link href="/schedule" className="px-8 py-3 bg-pitch-accent text-pitch-black text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-white transition-all shadow-lg">
                                        Find Match
                                    </Link>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar: Action Required */}
                <div className="lg:col-span-4 space-y-8">
                    <section className="space-y-6 lg:border-l lg:border-white/5 lg:pl-12">
                        <div className="flex items-center gap-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-pitch-secondary shrink-0">Action Items</h3>
                            <div className="h-px w-full bg-white/5" />
                        </div>

                        {actionRequiredRentals.length > 0 ? (
                            <div className="space-y-4">
                                {actionRequiredRentals.map((group) => (
                                    <div key={group.group_id} className="relative bg-yellow-400/5 border border-yellow-400/20 rounded-sm p-6 overflow-hidden">
                                        <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400" />
                                        <div className="space-y-4">
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60 block mb-1">Payment Required</span>
                                                <h4 className="text-xl font-black uppercase italic text-white leading-tight">{group.facility}</h4>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                                                    {group.bookings.length}x {group.resource} Reservations
                                                </p>
                                            </div>

                                            {group.contract && (
                                                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-yellow-500/80 bg-yellow-400/10 px-2 py-1 inline-block border border-yellow-400/20">
                                                    {group.contract.payment_term === 'weekly' ? 'Weekly' : 'Full Pay'} • {formatPrice(group.contract.final_price)}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handlePayContract(group.group_id)}
                                                disabled={isPayingContract === group.group_id}
                                                className="w-full py-4 bg-yellow-400 text-black font-black uppercase tracking-widest text-[10px] rounded-sm hover:bg-white transition-all shadow-xl shadow-yellow-400/10 flex items-center justify-center gap-2"
                                            >
                                                {isPayingContract === group.group_id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    'Complete Secure Payment'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-sm">
                                <Check className="w-8 h-8 text-green-500/20 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">All systems clear</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
