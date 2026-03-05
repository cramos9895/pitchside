
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, Clock, ArrowRight, Loader2, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';
import { GameCard } from '@/components/GameCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { createContractCheckoutSession } from '@/app/actions/stripe';

// Profile Utility
function formatPosition(pos: string) {
    if (pos === 'Forward') return 'FWD';
    if (pos === 'Midfielder') return 'MID';
    if (pos === 'Defender') return 'DEF';
    if (pos === 'Goalkeeper') return 'GK';
    return 'UTL';
}

// Client components don't need revalidate=0, useEffect handles fetching

export default function DashboardPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<any[]>([]);
    const [resourceBookings, setResourceBookings] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [isPayingContract, setIsPayingContract] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');
    const [user, setUser] = useState<any>(null);
    const [cancellingGameId, setCancellingGameId] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

    // Profile State
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({ caps: 0, wins: 0 });

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

                // --- Fetch Resource Bookings & Contracts (Rentals) ---
                const { data: rbData } = await supabase
                    .from('resource_bookings')
                    .select('*, facility:facilities(name), resource:resources(title)')
                    .eq('user_id', user.id)
                    .order('start_time', { ascending: true });
                if (rbData) setResourceBookings(rbData);

                const { data: cData } = await supabase
                    .from('recurring_booking_groups')
                    .select('*')
                    .eq('user_id', user.id);
                if (cData) setContracts(cData);

                // Fetch bookings with game details
                const { data: bookingsData, error } = await supabase
                    .from('bookings')
                    .select(`
                  *,
                  game:games(
                    *,
                    matches(*)
                  )
                `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error("Error fetching bookings:", error);
                } else {
                    // Filter out cancelled games and lost references (deleted games), as well as cancelled/dropped user bookings
                    const validBookings = (bookingsData || []).filter((b: any) =>
                        b.game &&
                        b.game.status !== 'cancelled' &&
                        b.status !== 'cancelled' &&
                        b.roster_status !== 'dropped'
                    );

                    if (validBookings.length > 0) {
                        const gameIds = validBookings.map((b: any) => b.game.id);
                        const { data: messagesData } = await supabase
                            .from('messages')
                            .select('event_id, created_at')
                            .in('event_id', gameIds)
                            .order('created_at', { ascending: false });

                        const latestMessages = new Map();
                        messagesData?.forEach(m => {
                            if (!latestMessages.has(m.event_id)) {
                                latestMessages.set(m.event_id, m.created_at);
                            }
                        });

                        const bookingsWithUnread = validBookings.map((b: any) => {
                            const latestMsg = latestMessages.get(b.game.id);
                            const isUnread = latestMsg && (!b.last_read_at || new Date(latestMsg) > new Date(b.last_read_at));
                            return { ...b, hasUnreadMessages: isUnread };
                        });
                        setBookings(bookingsWithUnread);
                    } else {
                        setBookings([]);
                    }

                    // --- Fetch Profile ---
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    setProfile(profileData);

                    // --- Calculate Profile Stats ---
                    let wins = 0;
                    const validForStats = (bookingsData || []).filter((b: any) => {
                        const g = b.game;
                        if (!g || b.status !== 'paid' || !g.matches) return false;
                        const hasCompletedMatches = g.matches.some((m: any) => m.status === 'completed');
                        if (!hasCompletedMatches) return false;

                        const myTeam = b.team_assignment;
                        let myScore = 0;
                        let oppScore = 0;
                        let played = false;

                        g.matches.forEach((m: any) => {
                            if (m.status !== 'completed') return;
                            if (m.home_team === myTeam) {
                                myScore += m.home_score;
                                oppScore += m.away_score;
                                played = true;
                            } else if (m.away_team === myTeam) {
                                myScore += m.away_score;
                                oppScore += m.home_score;
                                played = true;
                            }
                        });

                        if (!played) return false;
                        if (myScore > oppScore) wins++;
                        return true;
                    });

                    setStats({
                        caps: validForStats.length,
                        wins
                    });

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

    const mvpCount = profile?.mvp_awards || 0;
    const baseRating = 70;
    const gamesBonus = stats.caps * 0.1;
    const winBonus = stats.wins * 0.5;
    const mvpBonus = mvpCount * 1.0;

    const ovr = Math.min(99, Math.floor(
        baseRating + gamesBonus + winBonus + mvpBonus
    ));

    // Rating Tier Logic
    let tierColor = "text-gray-400 border-gray-400"; // Bronze/Default
    if (ovr >= 80) tierColor = "text-yellow-400 border-yellow-400 bg-yellow-500/10"; // Gold
    else if (ovr >= 75) tierColor = "text-gray-200 border-gray-300 bg-white/10"; // Silver
    else tierColor = "text-orange-300 border-orange-400 bg-orange-900/20"; // Bronze

    const groupedRentals = resourceBookings.reduce((acc: any, booking: any) => {
        const key = booking.recurring_group_id || booking.id;
        if (!acc[key]) {
            acc[key] = {
                id: key,
                isGroup: !!booking.recurring_group_id,
                bookings: [],
                facility: booking.facility?.name || 'Unknown Facility',
                resource: booking.resource?.title || 'Unknown Resource',
                status: booking.status, // assume all in group have same status
                contract: contracts.find(c => c.id === booking.recurring_group_id)
            };
        }
        acc[key].bookings.push(booking);
        return acc;
    }, {});

    const rentalGroups = Object.values(groupedRentals).sort((a: any, b: any) => {
        return new Date(b.bookings[0].start_time).getTime() - new Date(a.bookings[0].start_time).getTime();
    });

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

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pt-32 px-6">
            <div className="max-w-7xl mx-auto">
                <Tabs defaultValue="my-games" className="w-full">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-white/10 gap-4">
                        <div>
                            <h1 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter mb-2 flex items-center gap-3">
                                Player <span className="text-pitch-accent">Hub</span>
                            </h1>
                        </div>
                        <TabsList className="bg-black/40 border border-white/10">
                            <TabsTrigger value="my-games">My Games</TabsTrigger>
                            <TabsTrigger value="rentals">Facility Rentals</TabsTrigger>
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="my-games" className="space-y-6 mt-0">
                        {/* Sub-Tabs for Dashboard */}
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
                                            key={booking.game.id}
                                            game={booking.game}
                                            user={user}
                                            bookingStatus={booking.status}
                                            hasUnreadMessages={booking.hasUnreadMessages}
                                        // Note: GameCard usually handles 'Join' button.
                                        // For Dashboard, we might want 'View Details' or 'Cancel'?
                                        // GameCard logic might need checking if it shows 'Joined' correctly.
                                        // Assuming GameCard adapts to user being joined.
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="rentals" className="space-y-6 mt-0">
                        {rentalGroups.length === 0 ? (
                            <div className="text-center py-20 border border-white/5 rounded-sm bg-pitch-card">
                                <h2 className="text-2xl font-bold mb-4">No Rentals Found</h2>
                                <p className="text-pitch-secondary mb-8">
                                    You haven't requested any facility rentals yet.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in duration-500">
                                {rentalGroups.map((group: any) => (
                                    <div key={group.id} className="bg-pitch-card border border-white/10 rounded-sm p-6 space-y-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                                            <div>
                                                <h3 className="font-bold text-lg">{group.facility}</h3>
                                                <p className="text-pitch-secondary text-sm">{group.resource}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {group.status === 'awaiting_payment' ? (
                                                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-bold uppercase tracking-wider rounded-sm border border-yellow-500/30">
                                                        Action Required
                                                    </span>
                                                ) : group.status === 'confirmed' ? (
                                                    <span className="px-3 py-1 bg-green-500/20 text-green-500 text-xs font-bold uppercase tracking-wider rounded-sm border border-green-500/30">
                                                        Confirmed
                                                    </span>
                                                ) : group.status === 'pending_contract' || group.status === 'pending_facility_review' ? (
                                                    <span className="px-3 py-1 bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider rounded-sm border border-white/20">
                                                        Under Review
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider rounded-sm border border-white/10">
                                                        {group.status.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {group.bookings.slice(0, 3).map((b: any) => (
                                                <div key={b.id} className="flex justify-between items-center text-sm p-3 bg-black/30 rounded border border-white/5">
                                                    <div className="font-medium text-gray-300">{new Date(b.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                                    <div className="text-pitch-secondary">
                                                        {new Date(b.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            ))}
                                            {group.bookings.length > 3 && (
                                                <div className="text-xs text-center text-pitch-secondary pt-2 italic">
                                                    + {group.bookings.length - 3} more dates in this series
                                                </div>
                                            )}
                                        </div>

                                        {group.status === 'awaiting_payment' && group.contract && (
                                            <div className="mt-4 pt-4 border-t border-yellow-500/20 bg-yellow-500/5 p-4 rounded-sm flex flex-col md:flex-row items-center justify-between gap-4">
                                                <div>
                                                    <h4 className="font-bold text-yellow-400 mb-1">Payment Required</h4>
                                                    <p className="text-sm text-gray-300">
                                                        {group.contract.payment_term === 'weekly'
                                                            ? `Weekly Auto-Pay Setup (Total: $${(group.contract.final_price / 100).toFixed(2)})`
                                                            : `Upfront Payment of $${(group.contract.final_price / 100).toFixed(2)}`}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handlePayContract(group.id)}
                                                    disabled={isPayingContract === group.id}
                                                    className="w-full md:w-auto px-6 py-3 bg-pitch-accent text-pitch-black font-bold uppercase tracking-wider text-sm rounded-sm hover:-translate-y-0.5 transition-all shadow-lg disabled:opacity-50 disabled:hover:-translate-y-0"
                                                >
                                                    {isPayingContract === group.id ? 'Processing...' : 'Pay & Confirm'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="profile" className="mt-0">
                        <div className="flex flex-col items-center">
                            {/* FIFA CARD CONTAINER */}
                            <div className={cn(
                                "relative w-full max-w-sm aspect-[2/3] rounded-xl border-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col items-center pt-8 text-center select-none transform transition-transform hover:scale-[1.02]",
                                ovr >= 80 ? "bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-800 border-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.4)]"
                                    : "bg-gradient-to-br from-gray-300 via-gray-100 to-gray-400 border-gray-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] text-black"
                            )}>

                                {/* Card Background pattern */}
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />

                                {/* Rating & Position (Top Left) */}
                                <div className="absolute top-8 left-8 text-left z-10 flex flex-col items-center">
                                    {/* Stat Shield */}
                                    <div className={cn("w-16 h-16 border-2 flex items-center justify-center rounded-full mb-1 backdrop-blur-md shadow-lg", tierColor)}>
                                        <span className="text-4xl font-black italic leading-none">{ovr}</span>
                                    </div>
                                    <div className={cn("text-lg font-bold uppercase tracking-wider", ovr >= 80 ? "text-white/80" : "text-black/60")}>
                                        {formatPosition(profile?.position || 'Utility')}
                                    </div>
                                </div>

                                {/* Avatar */}
                                <div className="w-48 h-48 rounded-full bg-black/20 border-4 border-white/20 mb-4 overflow-hidden relative z-10 mt-6 group flex items-center justify-center">
                                    {profile?.avatar_url ? (
                                        <img
                                            src={profile.avatar_url}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-24 h-24 text-white/50" />
                                    )}
                                </div>

                                {/* Name */}
                                <div className="relative z-10 uppercase w-full px-4 mb-2">
                                    <h2 className={cn(
                                        "font-heading text-3xl font-bold italic truncate text-shadow-sm",
                                        ovr >= 80 ? "text-white" : "text-black"
                                    )}>
                                        {profile?.full_name || 'ROOKIE'}
                                    </h2>
                                </div>

                                {/* Divider */}
                                <div className="w-2/3 h-0.5 bg-current opacity-20 mb-6 z-10" />

                                {/* Stats Grid */}
                                <div className={cn("grid grid-cols-2 gap-x-12 gap-y-2 text-left w-full px-12 z-10 font-mono text-sm", ovr >= 80 ? "text-white" : "text-black")}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold opacity-70">PAC</span>
                                        <span className="font-black text-lg">88</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold opacity-70">DRI</span>
                                        <span className="font-black text-lg">84</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold opacity-70">SHO</span>
                                        <span className="font-black text-lg">81</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold opacity-70">DEF</span>
                                        <span className="font-black text-lg">75</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold opacity-70">PAS</span>
                                        <span className="font-black text-lg">79</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold opacity-70">PHY</span>
                                        <span className="font-black text-lg">83</span>
                                    </div>
                                </div>

                                {/* Bio / Footer */}
                                <div className="mt-auto mb-8 w-full px-6 z-10">
                                    <p className={cn("text-xs italic line-clamp-2 min-h-[2.5em]", ovr >= 80 ? "text-white/70" : "text-black/60")}>
                                        {profile?.bio || "No bio yet. Ready to play!"}
                                    </p>
                                </div>
                            </div>

                            {/* CAREER STATS SECTION */}
                            <div className="w-full max-w-sm mt-8 grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-pitch-card p-4 rounded-sm border border-white/10 text-center flex flex-col items-center shadow-lg">
                                    <span className="text-3xl font-heading font-black italic text-white mb-1">{stats.caps}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-pitch-secondary">APPS</span>
                                </div>
                                <div className="bg-pitch-card p-4 rounded-sm border border-white/10 text-center flex flex-col items-center shadow-lg">
                                    <span className="text-3xl font-heading font-black italic text-green-500 mb-1">{stats.wins}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-pitch-secondary">WINS</span>
                                </div>
                                <div className="bg-pitch-card p-4 rounded-sm border border-white/10 text-center flex flex-col items-center shadow-lg">
                                    <span className="text-3xl font-heading font-black italic text-pitch-accent mb-1">{mvpCount}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-pitch-secondary">MVPs</span>
                                </div>
                            </div>

                            {/* MATCH HISTORY */}
                            <div className="w-full max-w-2xl px-4 mt-8">
                                <h3 className="font-heading text-xl font-bold italic uppercase mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-pitch-accent" />
                                    Match History
                                </h3>

                                <div className="space-y-4">
                                    {bookings.map((booking: any) => {
                                        const game = booking.game;
                                        if (!game || !game.matches || game.matches.filter((m: any) => m.status === 'completed').length === 0) return null;

                                        const myTeam = booking.team_assignment;
                                        if (!myTeam) return null;

                                        // Aggregate Score
                                        let myScore = 0;
                                        let oppScore = 0;
                                        let played = false;

                                        game.matches.forEach((m: any) => {
                                            if (m.status !== 'completed') return;
                                            if (m.home_team === myTeam) {
                                                myScore += m.home_score;
                                                oppScore += m.away_score;
                                                played = true;
                                            } else if (m.away_team === myTeam) {
                                                myScore += m.away_score;
                                                oppScore += m.home_score;
                                                played = true;
                                            }
                                        });

                                        if (!played) return null;

                                        let result: 'win' | 'loss' | 'draw' = 'draw';
                                        if (myScore > oppScore) result = 'win';
                                        if (myScore < oppScore) result = 'loss';

                                        return (
                                            <div key={booking.id} className="bg-pitch-card border border-white/5 p-4 rounded-sm flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-2 h-12 rounded-full",
                                                        result === 'win' ? "bg-green-500" :
                                                            result === 'loss' ? "bg-red-500" : "bg-gray-500"
                                                    )} />
                                                    <div>
                                                        <div className="font-bold text-lg mb-0.5">{game.title}</div>
                                                        <div className="text-xs text-pitch-secondary uppercase font-bold">
                                                            {new Date(game.start_time).toLocaleDateString()} • {game.location}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="text-center w-24">
                                                        <div className={cn(
                                                            "font-mono font-black text-sm tracking-widest px-2 py-1 rounded bg-black/40 border border-white/10 mb-1",
                                                            result === 'win' ? "text-green-400 border-green-500/30" :
                                                                result === 'loss' ? "text-red-400 border-red-500/30" : "text-gray-400"
                                                        )}>
                                                            {result === 'draw' ? 'D' : result === 'win' ? 'W' : 'L'}
                                                        </div>
                                                        <span className="block text-[10px] font-bold text-pitch-secondary uppercase">
                                                            Rec: {result === 'win' ? "1-0-0" : result === 'draw' ? "0-1-0" : "0-0-1"}
                                                        </span>
                                                    </div>
                                                    <div className={cn(
                                                        "px-3 py-1 rounded-sm text-xs font-bold uppercase w-16 text-center",
                                                        result === 'win' ? "bg-green-500/20 text-green-500" :
                                                            result === 'loss' ? "bg-red-500/20 text-red-500" :
                                                                "bg-gray-500/20 text-gray-400"
                                                    )}>
                                                        {result === 'draw' ? 'Draw' : result === 'win' ? 'Win' : 'Loss'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {bookings.filter((b: any) => {
                                        const g = b.game;
                                        return g && g.matches && g.matches.some((m: any) => m.status === 'completed');
                                    }).length === 0 && (
                                            <p className="text-center text-gray-500 italic py-8">No match history recorded yet.</p>
                                        )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <ConfirmationModal
                        isOpen={!!cancellingGameId}
                        onClose={() => setCancellingGameId(null)}
                        onConfirm={handleCancel}
                        title="Cancel Booking"
                        message="Are you sure you want to cancel your spot? This action cannot be undone."
                        confirmText="Yes, Cancel Booking"
                        isDestructive={true}
                    />
                </Tabs>
            </div>
        </div>
    );
}
