'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createContractCheckoutSession } from '@/app/actions/stripe';

export default function DashboardOverviewPage() {
    const supabase = createClient();
    const router = useRouter();
    const { success, error: toastError } = useToast();

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [nextUpContent, setNextUpContent] = useState<any>(null);
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

                // 1. Fetch Action Required Rentals (awaiting_payment)
                const { data: pendingBookings } = await supabase
                    .from('resource_bookings')
                    .select('*, facility:facilities(name), resource:resources(title)')
                    .eq('user_id', user.id)
                    .eq('status', 'awaiting_payment')
                    .order('start_time', { ascending: true });

                if (pendingBookings) {
                    // Group them by recurring_group_id or single id
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

                    // Fetch Contract Terms for these groups
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

                // 2. Fetch Single "Next Up" Event (Confirmed Rental OR Pick-up Game)
                const { data: upcomingRentals } = await supabase
                    .from('resource_bookings')
                    .select('*, facility:facilities(name), resource:resources(title)')
                    .eq('user_id', user.id)
                    .eq('status', 'confirmed')
                    .gte('start_time', now)
                    .order('start_time', { ascending: true })
                    .limit(1);

                const { data: upcomingGamesData } = await supabase
                    .from('bookings')
                    .select('id, game:games(id, start_time, end_time, title, facility:facilities(name))')
                    .eq('user_id', user.id)
                    .in('status', ['paid', 'confirmed'])
                    .not('roster_status', 'eq', 'dropped');

                // Filter games manually to find the closest future one (since we can't deep filter inside the join easily on Supabase free tier without rpc)
                let closestGame: any = null;
                if (upcomingGamesData) {
                    const futureGames = upcomingGamesData
                        .map((b: any) => b.game)
                        .filter((g: any) => g && new Date(g.start_time).toISOString() >= now)
                        .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                    if (futureGames.length > 0) closestGame = futureGames[0];
                }

                const nextRental = upcomingRentals?.[0];

                if (nextRental && closestGame) {
                    // Compare
                    if (new Date(nextRental.start_time).getTime() < new Date(closestGame.start_time).getTime()) {
                        setNextUpContent({ type: 'rental', data: nextRental });
                    } else {
                        setNextUpContent({ type: 'game', data: closestGame });
                    }
                } else if (nextRental) {
                    setNextUpContent({ type: 'rental', data: nextRental });
                } else if (closestGame) {
                    setNextUpContent({ type: 'game', data: closestGame });
                }

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

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-white">
            <div>
                <h2 className="text-2xl font-bold mb-1 border-b border-white/5 pb-4">Welcome back.</h2>
                <p className="text-pitch-secondary mt-2">Here's a snapshot of your PitchSide activity.</p>
            </div>

            {/* ACTION REQUIRED SECTION */}
            {actionRequiredRentals.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                        Action Required
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                        {actionRequiredRentals.map((group) => (
                            <div key={group.group_id} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                                <div>
                                    <h4 className="font-bold text-yellow-400 text-lg mb-1">{group.facility}</h4>
                                    <p className="text-yellow-500/80 text-sm mb-2 font-medium">
                                        {group.bookings.length}x {group.resource} Reservations
                                    </p>

                                    {group.contract && (
                                        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-300 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
                                            {group.contract.payment_term === 'weekly'
                                                ? `Weekly Auto-Pay (${formatPrice(Math.floor(group.contract.final_price / group.bookings.length))} /wk)`
                                                : `Pay In Full (${formatPrice(group.contract.final_price)})`
                                            }
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handlePayContract(group.group_id)}
                                    disabled={isPayingContract === group.group_id}
                                    className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-pitch-accent text-black font-bold uppercase tracking-wider text-sm rounded-md shadow-sm hover:shadow-md transition-all hover:bg-yellow-400 disabled:opacity-50"
                                >
                                    {isPayingContract === group.group_id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Review & Pay'
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* NEXT UP SECTION */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold">Next Up</h3>

                {nextUpContent ? (
                    <div className="bg-pitch-card border border-white/10 rounded-lg p-0 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row">
                            <div className="bg-black text-white p-6 sm:w-48 shrink-0 flex flex-col justify-center items-center text-center border-b sm:border-b-0 sm:border-r border-white/10">
                                <span className="text-sm font-bold uppercase tracking-widest text-pitch-accent mb-1">
                                    {new Date(nextUpContent.data.start_time).toLocaleDateString(undefined, { month: 'short' })}
                                </span>
                                <span className="text-4xl font-black italic tracking-tighter">
                                    {new Date(nextUpContent.data.start_time).getDate()}
                                </span>
                                <span className="text-sm text-pitch-secondary mt-1 uppercase tracking-wider">
                                    {new Date(nextUpContent.data.start_time).toLocaleDateString(undefined, { weekday: 'long' })}
                                </span>
                            </div>

                            <div className="p-6 flex-1 flex flex-col justify-center">
                                <div className={cn(
                                    "inline-block px-2 py-1 text-xs font-bold uppercase tracking-wider rounded border mb-3 w-fit",
                                    nextUpContent.type === 'game'
                                        ? "bg-pitch-accent/10 text-pitch-accent border-pitch-accent/20"
                                        : "bg-green-500/20 text-green-400 border-green-500/30"
                                )}>
                                    {nextUpContent.type === 'game' ? 'Joined Game' : 'Confirmed Rental'}
                                </div>
                                <h4 className="text-2xl font-bold mb-2">
                                    {nextUpContent.type === 'game' ? nextUpContent.data.title || 'Pick-Up Game' : nextUpContent.data.facility}
                                </h4>

                                <div className="space-y-2 mt-2">
                                    <div className="flex items-center text-sm text-gray-300 font-medium">
                                        <MapPin className="w-4 h-4 mr-3 text-pitch-secondary" />
                                        {nextUpContent.type === 'game' ? nextUpContent.data.facility?.name : nextUpContent.data.resource}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-300 font-medium">
                                        <Clock className="w-4 h-4 mr-3 text-pitch-secondary" />
                                        {new Date(nextUpContent.data.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                        {nextUpContent.data.end_time && ` - ${new Date(nextUpContent.data.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                                    </div>
                                </div>

                                {nextUpContent.type === 'game' && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <Link
                                            href={`/games/${nextUpContent.data.id}`}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded transition-colors inline-flex"
                                        >
                                            View Match Workspace
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-pitch-card border border-dashed border-white/10 rounded-lg p-10 text-center">
                        <Calendar className="w-10 h-10 text-pitch-secondary mx-auto mb-3 opacity-50" />
                        <h4 className="font-bold mb-1">Your schedule is clear.</h4>
                        <p className="text-sm text-pitch-secondary mb-4">You have no upcoming confirmed games or rentals.</p>
                        <div className="flex items-center justify-center gap-4">
                            <Link href="/" className="inline-flex items-center px-4 py-2 bg-pitch-accent text-black text-sm font-bold uppercase tracking-wider rounded-md hover:bg-white transition-colors shadow-sm">
                                Find a Game
                            </Link>
                            <Link href="/facilities" className="inline-flex items-center px-4 py-2 bg-white/5 border border-white/10 text-white text-sm font-bold uppercase tracking-wider rounded-md hover:bg-white/10 transition-colors shadow-sm">
                                Rent a Field
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
