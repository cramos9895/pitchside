
'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Check, Shirt, User as UserIcon, Users, X, Trophy, Save, Loader2, Swords, Calendar, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { MatchManager } from '@/components/admin/MatchManager';
import { StandingsTable } from '@/components/admin/StandingsTable';
import { ScheduleGenerator } from '@/components/admin/ScheduleGenerator';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface Booking {
    id: string;
    checked_in: boolean;
    team_assignment: string | null;
    team: 'A' | 'B' | null; // NEW FIELD
    note: string | null; // Request note
    user_id: string;
    profiles: {
        email: string;
        full_name: string;
    } | {
        email: string;
        full_name: string;
    }[] | null;
    status: string; // Add status explicitly to interface
}

import { TeamManager } from '@/components/admin/TeamManager';

interface TeamConfig {
    name: string;
    color: string;
}

interface Game {
    id: string;
    title: string;
    start_time: string;
    price: number;
    teams_config: TeamConfig[] | null;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    home_score: number;
    away_score: number;
    mvp_player_id: string | null;
    refund_processed: boolean;
    max_players: number;
}

interface Match {
    id: string;
    game_id: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    round_number: number;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    is_final?: boolean;
}


const COLOR_MAP: Record<string, string> = {
    'Neon Orange': 'bg-orange-500 border-orange-500 text-white',
    'Neon Blue': 'bg-cyan-400 border-cyan-400 text-black',
    'Neon Green': '#ccff00', // Specialized handling might be needed if using hex
    'White': 'bg-white border-white text-black',
    'Black': 'bg-black border-white text-white',
    'Red': 'bg-red-500 border-red-500 text-white',
    'Yellow': 'bg-yellow-400 border-yellow-400 text-black'
};

export default function RosterPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const gameId = resolvedParams.id;

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [game, setGame] = useState<Game | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [finalizing, setFinalizing] = useState(false);

    // Match Control States
    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [matchStatus, setMatchStatus] = useState<'scheduled' | 'active' | 'completed' | 'cancelled'>('scheduled');
    const [mvpId, setMvpId] = useState<string>('');

    // View Mode
    const [viewMode, setViewMode] = useState<'single' | 'tournament'>('single');
    const [showScheduler, setShowScheduler] = useState(false);

    // Live Refresh (Triggers re-fetch of standings)
    const [refreshKey, setRefreshKey] = useState(0);

    // Modals
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    const handleMatchUpdate = () => {
        setRefreshKey(prev => prev + 1);
        fetchMatches(); // Also re-fetch matches locally
    };

    const supabase = createClient();
    const router = useRouter();
    const toast = useToast();

    const fetchMatches = async () => {
        const { data: matchesData } = await supabase
            .from('matches')
            .select('*')
            .eq('game_id', gameId)
            .order('created_at', { ascending: true });

        setMatches(matchesData || []);

        // Auto-switch to tournament mode if matches exist
        if (matchesData && matchesData.length > 0) {
            setViewMode('tournament');
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Game
                const { data: gameData, error: gameError } = await supabase
                    .from('games')
                    .select('*, teams_config')
                    .eq('id', gameId)
                    .single();

                if (gameError) throw gameError;
                setGame(gameData);

                // Initialize Control States
                setHomeScore(gameData.home_score || 0);
                setAwayScore(gameData.away_score || 0);
                setMatchStatus(gameData.status || 'scheduled');
                setMvpId(gameData.mvp_player_id || '');

                await fetchMatches();

            } catch (err) {
                console.error("Error fetching data:", err);
            }

            try {
                // Fetch Bookings
                const { data: bookingsData, error: bookingsError } = await supabase
                    .from('bookings')
                    .select('*, profiles(email, full_name, id)')
                    .eq('game_id', gameId)
                    .order('created_at', { ascending: true });

                if (bookingsError) throw bookingsError;
                setBookings((bookingsData || []) as any);
            } catch (err) {
                console.error("Error fetching roster:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [gameId, supabase]);

    const toggleCheckIn = async (bookingId: string, currentStatus: boolean) => {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, checked_in: !currentStatus } : b));
        await supabase.from('bookings').update({ checked_in: !currentStatus }).eq('id', bookingId);
        router.refresh();
    };

    const assignTeam = async (bookingId: string, teamName: string) => {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, team_assignment: teamName } : b));
        await supabase.from('bookings').update({ team_assignment: teamName }).eq('id', bookingId);
        router.refresh();
    };

    const onFinalizeClick = () => {
        setShowFinalizeModal(true);
    };

    const confirmFinalize = async () => {
        let calculatedWinner: 'home' | 'away' | 'draw' = 'draw';
        if (homeScore > awayScore) calculatedWinner = 'home';
        if (awayScore > homeScore) calculatedWinner = 'away';

        setFinalizing(true);
        try {
            const response = await fetch('/api/games/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId,
                    homeScore,
                    awayScore,
                    status: 'completed',
                    winner: calculatedWinner,
                    mvpPlayerId: mvpId
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setMatchStatus('completed');
            toast.success(`Match Finalized! Result: ${calculatedWinner.toUpperCase()} Win.`);
            router.refresh();

        } catch (error: any) {
            toast.error("Error finalizing match: " + error.message);
        } finally {
            setFinalizing(false);
            setShowFinalizeModal(false);
            if (matchStatus !== 'completed') {
                router.push('/admin'); // Redirect to dashboard on first finalize
                router.refresh();
            } else {
                router.refresh(); // Just refresh if updating stats
            }
        }
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const onCancelClick = () => {
        setShowCancelModal(true);
    };

    const confirmCancel = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.from('games').update({ status: 'cancelled' }).eq('id', gameId);
            if (error) throw error;
            router.refresh();
            toast.success("Event cancelled successfully.");
            router.push('/admin'); // Redirect back to dashboard
        } catch (e: any) {
            toast.error("Error cancelling event: " + e.message);
            setLoading(false);
        } finally {
            setShowCancelModal(false);
        }
    };

    const confirmDelete = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.from('games').delete().eq('id', gameId);
            if (error) throw error;
            toast.success("Event deleted successfully.");
            router.push('/admin');
        } catch (e: any) {
            toast.error("Error deleting event: " + e.message);
            setLoading(false);
        } finally {
            setShowDeleteModal(false);
        }
    }

    if (loading) return <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">Loading Roster...</div>;
    if (!game) return <div className="text-white pt-32 text-center">Game not found</div>;

    const gameDate = new Date(game.start_time);
    const endDate = new Date(gameDate.getTime() + 90 * 60000);
    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const startTimeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const endTimeStr = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Default teams if none config (fallback)
    const teams = game.teams_config || [
        { name: 'Team A', color: 'Neon Orange' },
        { name: 'Team B', color: 'White' }
    ];

    // Split Bookings
    const roster = bookings.filter(b => (b as any).status === 'paid' || (b as any).status === 'active');
    const waitlist = bookings.filter(b => (b as any).status === 'waitlist');

    // Calculate Counts (using only roster)
    const teamCounts = teams.reduce((acc, team) => {
        acc[team.name] = roster.filter(b => b.team_assignment === team.name).length;
        return acc;
    }, {} as Record<string, number>);

    const playerOptions = roster.map(b => {
        const profilesData = b.profiles;
        const profile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
        return {
            id: b.user_id, // Use booking user_id
            name: profile?.full_name || profile?.email || 'Unknown'
        }
    });

    const promotePlayer = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'active' }) // 'active' = promoted/confirmed manually
                .eq('id', bookingId);

            if (error) throw error;

            toast.success("Player promoted to active roster.");
            router.refresh();
            // Optimistic update
            const updatedBookings = bookings.map(b => b.id === bookingId ? { ...b, status: 'active' } : b);
            setBookings(updatedBookings as any);

        } catch (error: any) {
            toast.error("Error promoting player: " + error.message);
        }
    };

    // CANCELLATION SUMMARY VIEW
    if (matchStatus === 'cancelled') {
        return (
            <div className="min-h-screen bg-pitch-black text-white p-6 pt-32 font-sans overflow-x-hidden pb-40">
                <div className="max-w-4xl mx-auto">
                    <Link href="/admin" className="flex items-center text-pitch-secondary hover:text-white mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                    </Link>

                    {/* Header */}
                    <div className={cn(
                        "rounded-sm p-8 mb-8 text-center",
                        game.refund_processed ? "bg-gray-900 border border-white/10" : "bg-red-950/20 border border-red-500/20"
                    )}>
                        <h1 className="font-heading text-4xl md:text-5xl font-bold italic uppercase tracking-tighter text-white mb-2 line-through decoration-red-500/50">
                            {game.title}
                        </h1>
                        <div className={cn(
                            "inline-block px-4 py-1 text-white font-black uppercase tracking-widest text-sm rounded mb-4",
                            game.refund_processed ? "bg-gray-600" : "bg-red-500"
                        )}>
                            {game.refund_processed ? "Refund Processed" : "Refund Needed"}
                        </div>
                        <p className="text-pitch-secondary text-lg">
                            {dateStr} • {startTimeStr} - {endTimeStr}
                        </p>
                    </div>

                    {/* Refund Banner */}
                    {game.refund_processed && (
                        <div className="bg-green-500/10 border border-green-500 text-green-500 p-4 rounded-sm mb-8 flex items-center justify-center gap-2 font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-4">
                            <Check className="w-5 h-5" /> Refunds have been processed for this event.
                        </div>
                    )}

                    {/* Roster & Refund Section */}
                    <div className="bg-pitch-card border border-white/10 rounded-sm p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                            <h2 className="font-heading text-2xl font-bold italic uppercase flex items-center gap-2">
                                <Users className="w-6 h-6 text-pitch-accent" /> Registered Players ({bookings.length})
                            </h2>
                            {/* Refund Action */}
                            <div className="flex items-center gap-4">
                                {game.refund_processed ? (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500 text-green-500 rounded-sm font-bold uppercase text-xs tracking-wider">
                                        <Check className="w-4 h-4" /> Refund Complete
                                    </div>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            const confirmRefund = confirm("Mark refunds as processed for all players?");
                                            if (!confirmRefund) return;

                                            try {
                                                // Optimistic Update
                                                setGame(prev => prev ? { ...prev, refund_processed: true } : null);

                                                const { error } = await supabase
                                                    .from('games')
                                                    .update({ refund_processed: true })
                                                    .eq('id', game.id);

                                                if (error) {
                                                    // Revert on error
                                                    setGame(prev => prev ? { ...prev, refund_processed: false } : null);
                                                    throw error;
                                                }
                                                toast.success("Refund status updated.");
                                                router.refresh();
                                            } catch (e: any) {
                                                toast.error("Error updating refund status: " + e.message);
                                            }
                                        }}
                                        className="px-6 py-2 bg-white text-black font-bold uppercase tracking-wider rounded-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
                                    >
                                        Process Refund
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Roster Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-xs font-bold uppercase text-pitch-secondary tracking-wider">
                                    <tr>
                                        <th className="p-4">Player</th>
                                        <th className="p-4">Contact</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Paid</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {roster.map((booking: any) => {
                                        const profilesData = booking.profiles;
                                        const profile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
                                        const name = profile?.full_name || 'Unknown';
                                        const email = profile?.email || 'No Email';
                                        const isPaid = booking.status === 'paid';
                                        const isActive = booking.status === 'active';

                                        return (
                                            <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-bold">{name}</td>
                                                <td className="p-4 text-sm text-gray-400">{email}</td>
                                                <td className="p-4">
                                                    <span className={cn(
                                                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                                                        isPaid ? "bg-green-500/10 text-green-500" :
                                                            isActive ? "bg-blue-500/10 text-blue-500" : "bg-yellow-500/10 text-yellow-500"
                                                    )}>
                                                        {isPaid ? "Confirmed" : isActive ? "Promoted" : "Pending"}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-mono text-gray-400">
                                                    {isPaid ? `$${game.price}` : '$0.00'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {roster.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-pitch-secondary italic">
                                                No active players yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Waitlist Section */}
                    {waitlist.length > 0 && (
                        <div className="bg-pitch-card border border-white/10 rounded-sm p-6 shadow-xl mt-8">
                            <h2 className="font-heading text-2xl font-bold italic uppercase flex items-center gap-2 mb-6 text-yellow-500">
                                <Users className="w-6 h-6" /> Waitlist ({waitlist.length})
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 text-xs font-bold uppercase text-pitch-secondary tracking-wider">
                                        <tr>
                                            <th className="p-4">Player</th>
                                            <th className="p-4">Contact</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {waitlist.map((booking: any) => {
                                            const profilesData = booking.profiles;
                                            const profile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
                                            const name = profile?.full_name || 'Unknown';
                                            const email = profile?.email || 'No Email';

                                            return (
                                                <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 font-bold">{name}</td>
                                                    <td className="p-4 text-sm text-gray-400">{email}</td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => promotePlayer(booking.id)}
                                                            className="text-xs bg-green-500 hover:bg-green-400 text-black font-bold uppercase px-3 py-1 rounded transition-colors"
                                                        >
                                                            Promote
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        );
    }

    return (
        <div className="min-h-screen bg-pitch-black text-white p-6 pt-32 font-sans overflow-x-hidden pb-40">
            <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">

                {/* LEFT COLUMN: Main Roster Manager */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <Link href="/admin" className="flex items-center text-pitch-secondary hover:text-white mb-2 transition-colors">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                            </Link>
                            <h1 className="font-heading text-3xl md:text-4xl font-bold italic uppercase tracking-tighter">
                                Roster: <span className="text-pitch-accent">{game.title}</span>
                            </h1>
                            <div className="flex items-center gap-3">
                                <p className="text-pitch-secondary">{dateStr} • {startTimeStr} - {endTimeStr} • <span className={cn("uppercase font-bold", matchStatus === 'completed' ? 'text-green-500' : 'text-yellow-500')}>{matchStatus}</span></p>
                                <span className="text-sm font-bold bg-white/10 px-2 py-1 rounded text-white flex items-center gap-2">
                                    <Users className="w-4 h-4" /> {roster.length} / {game.max_players} Players
                                </span>
                            </div>
                        </div>

                        {/* Cancel Button */}
                        <div className="flex gap-2">
                            {matchStatus !== 'completed' && (matchStatus as string) !== 'cancelled' && (
                                <button
                                    onClick={onCancelClick}
                                    className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded uppercase font-bold text-xs tracking-wider transition-colors"
                                >
                                    Cancel Event
                                </button>
                            )}
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded uppercase font-bold text-xs tracking-wider transition-colors flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </div>
                    </div>

                    {/* Live Counters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {teams.map(team => {
                            const count = teamCounts[team.name] || 0;
                            const limit = (team as any).limit || 11;
                            const isFull = count >= limit;
                            const percentage = Math.min(100, (count / limit) * 100);

                            // Determine bar color based on team config
                            let barColor = 'bg-pitch-accent'; // Default
                            if (team.color === 'Neon Orange') barColor = 'bg-orange-500';
                            if (team.color === 'Neon Blue') barColor = 'bg-cyan-400';
                            if (team.color === 'Red') barColor = 'bg-red-500';
                            if (team.color === 'Yellow') barColor = 'bg-yellow-400';
                            if (team.color === 'Neon Green') barColor = 'bg-[#ccff00]';

                            return (
                                <div key={team.name} className="bg-pitch-card border border-white/10 p-4 rounded-sm">
                                    <div className="flex justify-between items-end mb-2">
                                        <h3 className="font-bold uppercase italic">{team.name}</h3>
                                        <span className={cn("text-xl font-black", isFull ? "text-red-500" : "text-white")}>
                                            {count}<span className="text-gray-500 text-sm">/{limit}</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full transition-all duration-500", barColor)}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Roster & Waitlist Container */}
                    <div className="space-y-8 mb-8">

                        {/* ACTIVE ROSTER */}
                        <div className="bg-pitch-card border border-white/10 rounded-sm shadow-xl overflow-hidden">
                            {/* Table Header - Only visible on Desktop */}
                            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/5 text-xs font-bold uppercase text-pitch-secondary tracking-wider">
                                <div className="col-span-4">Player</div>
                                <div className="col-span-2 text-center">In</div>
                                <div className="col-span-6 text-center">Team Assignment</div>
                            </div>

                            {/* Mobile Header */}
                            <div className="md:hidden p-4 border-b border-white/10 bg-white/5 text-xs font-bold uppercase text-pitch-secondary tracking-wider flex justify-between items-center">
                                <span>Player List</span>
                                <span>Actions</span>
                            </div>


                            {/* Rows */}
                            <div className="divide-y divide-white/5">
                                {roster.map((booking: any) => {
                                    const profilesData = booking.profiles;
                                    const profile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
                                    const displayName = profile?.full_name || profile?.email || 'Unknown Player';

                                    return (
                                        <div key={booking.id} className="flex flex-col md:grid md:grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors">
                                            {/* Player Info - Full Width on Mobile */}
                                            <div className="w-full md:col-span-4 flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 shrink-0">
                                                    <UserIcon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold truncate text-sm">{displayName}</div>
                                                    {booking.note && (
                                                        <div className="text-[10px] text-pitch-accent italic truncate max-w-[200px] md:max-w-[120px]">
                                                            Request: {booking.note}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Mobile: Controls Row */}
                                            <div className="w-full flex items-center justify-between md:contents">

                                                {/* Check In */}
                                                <div className="md:col-span-2 flex justify-center">
                                                    <button
                                                        onClick={() => toggleCheckIn(booking.id, booking.checked_in)}
                                                        className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center border transition-all",
                                                            booking.checked_in
                                                                ? "bg-pitch-accent border-pitch-accent text-pitch-black"
                                                                : "bg-transparent border-gray-600 text-gray-600 hover:border-white hover:text-white"
                                                        )}
                                                        title={booking.checked_in ? "Checked In" : "Check In"}
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Team Buttons - Flex Wrap for Mobile */}
                                                <div className="flex-1 flex justify-end md:justify-center gap-2 flex-wrap md:col-span-6">
                                                    {teams.map(team => {
                                                        const isSelected = booking.team_assignment === team.name;
                                                        // Dynamic Stylings
                                                        const baseClass = "px-2 py-1 text-xs font-bold uppercase rounded border transition-colors flex items-center gap-1 min-w-[60px] md:min-w-[70px] justify-center";

                                                        let styleClass = "border-gray-700 text-gray-400 hover:border-gray-500";
                                                        let inlineStyle = {};

                                                        if (isSelected) {
                                                            if (COLOR_MAP[team.color]) {
                                                                styleClass = COLOR_MAP[team.color];
                                                            } else if (team.color === 'Neon Green') {
                                                                styleClass = 'text-pitch-black border-[#ccff00]';
                                                                inlineStyle = { backgroundColor: '#ccff00' };
                                                            } else {
                                                                styleClass = 'bg-gray-600 text-white border-gray-600';
                                                            }
                                                        }

                                                        return (
                                                            <button
                                                                key={team.name}
                                                                onClick={() => assignTeam(booking.id, team.name)}
                                                                className={cn(baseClass, styleClass)}
                                                                style={inlineStyle}
                                                            >
                                                                <Shirt className="w-3 h-3" /> {team.name}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {roster.length === 0 && <div className="p-8 text-center text-pitch-secondary">No players yet.</div>}
                            </div>
                        </div>

                        {/* WAITLIST */}
                        {waitlist.length > 0 && (
                            <div className="bg-gray-900 border border-white/10 rounded-sm shadow-xl overflow-hidden">
                                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-yellow-500" />
                                    <h3 className="font-bold uppercase text-sm text-yellow-500 tracking-wider">Waitlist ({waitlist.length})</h3>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {waitlist.map((booking: any) => {
                                        const profilesData = booking.profiles;
                                        const profile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
                                        const displayName = profile?.full_name || profile?.email || 'Unknown Player';

                                        return (
                                            <div key={booking.id} className="flex items-center justify-between p-4 hover:bg-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 shrink-0">
                                                        <UserIcon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold truncate text-sm text-gray-300">{displayName}</div>
                                                        <div className="text-[10px] text-gray-500 italic">Waitlisted</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => promotePlayer(booking.id)}
                                                    className="text-xs bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-black font-bold uppercase px-3 py-1 rounded transition-colors"
                                                >
                                                    Promote to Roster
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* TEAM BALANCING SECTION */}
                    <div className="mb-8">
                        <TeamManager
                            gameId={gameId}
                            teams={teams}
                            players={bookings.map(b => ({
                                id: b.id,
                                userId: b.user_id,
                                name: Array.isArray(b.profiles) ? b.profiles[0]?.full_name : b.profiles?.full_name || 'Unknown',
                                email: Array.isArray(b.profiles) ? b.profiles[0]?.email : b.profiles?.email || '',
                                team: b.team_assignment as any || null,
                                status: b.status
                            }))}
                            onUpdate={() => router.refresh()}
                        />
                    </div>

                    {/* MODE TOGGLE & TABS */}
                    <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                        <button
                            onClick={() => setViewMode('single')}
                            className={cn(
                                "text-sm font-bold uppercase flex items-center gap-2 transition-colors",
                                viewMode === 'single' ? "text-pitch-accent" : "text-gray-500 hover:text-white"
                            )}
                        >
                            <Trophy className="w-4 h-4" /> Single Match
                        </button>
                        <div className="w-px h-4 bg-white/20"></div>
                        <button
                            onClick={() => setViewMode('tournament')}
                            className={cn(
                                "text-sm font-bold uppercase flex items-center gap-2 transition-colors",
                                viewMode === 'tournament' ? "text-pitch-accent" : "text-gray-500 hover:text-white"
                            )}
                        >
                            <Swords className="w-4 h-4" /> Tournament Mode
                        </button>
                    </div>


                    {viewMode === 'single' ? (
                        /* SINGLE MATCH CONTROL PANEL */
                        <div className="bg-gray-900 border border-gray-800 rounded-sm p-6">
                            <h2 className="font-heading text-xl font-bold italic uppercase flex items-center gap-2 mb-6">
                                <Trophy className="w-5 h-5 text-yellow-500" /> Match Control ({matchStatus})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* 1. Scoreboard */}
                                <div className="bg-black/30 p-4 rounded border border-white/5">
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-3">Scoreboard</label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <span className="block text-[10px] text-gray-500 mb-1 uppercase truncate">{teams[0].name}</span>
                                            <input
                                                type="number"
                                                value={homeScore}
                                                onChange={(e) => setHomeScore(Number(e.target.value))}
                                                className="w-full bg-black border border-white/20 p-2 text-center font-mono text-xl text-white rounded focus:border-pitch-accent outline-none"
                                            />
                                        </div>
                                        <span className="text-gray-600 font-bold">-</span>
                                        <div className="flex-1">
                                            <span className="block text-[10px] text-gray-500 mb-1 uppercase truncate">{teams[1].name}</span>
                                            <input
                                                type="number"
                                                value={awayScore}
                                                onChange={(e) => setAwayScore(Number(e.target.value))}
                                                className="w-full bg-black border border-white/20 p-2 text-center font-mono text-xl text-white rounded focus:border-pitch-accent outline-none"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-2 text-center italic">
                                        Winner automatically detected from score.
                                    </p>
                                </div>

                                {/* 2. MVP Selection */}
                                <div className="bg-black/30 p-4 rounded border border-white/5">
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-3">Man of the Match</label>
                                    <select
                                        value={mvpId}
                                        onChange={(e) => setMvpId(e.target.value)}
                                        className="w-full bg-black border border-white/20 rounded p-2 text-sm text-white focus:outline-none focus:border-pitch-accent"
                                    >
                                        <option value="">Select MVP...</option>
                                        {playerOptions.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-500 mt-2">Awarding MVP adds stats to player profile.</p>
                                </div>

                                {/* Action Button */}
                                <div className="flex items-end justify-end">
                                    <button
                                        onClick={onFinalizeClick}
                                        disabled={finalizing}
                                        className={cn(
                                            "w-full px-6 py-3 font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 shadow-lg transition-all h-[80px]",
                                            matchStatus === 'completed'
                                                ? "bg-green-600 text-white hover:bg-green-500"
                                                : "bg-pitch-accent text-pitch-black hover:bg-white hover:text-pitch-black"
                                        )}
                                    >
                                        {finalizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        {matchStatus === 'completed' ? "Update Match Stats" : "Finalize Match"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* TOURNAMENT MODE */
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                            {/* Scheduler Toggle */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowScheduler(!showScheduler)}
                                    className="text-xs text-pitch-secondary hover:text-white flex items-center gap-2 uppercase font-bold"
                                >
                                    <Calendar className="w-3 h-3" /> {showScheduler ? "Hide Scheduler" : "Show Auto-Scheduler"}
                                </button>
                            </div>

                            {showScheduler && (
                                <ScheduleGenerator
                                    gameId={gameId}
                                    teams={teams as TeamConfig[]}
                                    onScheduleSaved={fetchMatches}
                                />
                            )}
                            <MatchManager
                                gameId={gameId}
                                teams={teams as TeamConfig[]}
                                existingMatches={matches}
                                onMatchUpdate={handleMatchUpdate}
                                players={bookings?.map((b: any) => ({
                                    id: b.user_id, // bookings has user_id, profiles has details
                                    name: b.profiles?.full_name || 'Unknown',
                                    team: b.team_assignment
                                })) || []}
                                gameStatus={game?.status || 'scheduled'}
                                initialMvpId={game?.mvp_player_id}
                            />
                            <StandingsTable
                                key={refreshKey} // Force re-mount/re-fetch on update
                                gameId={gameId}
                                teams={teams as TeamConfig[]}
                                matches={matches}
                            />
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: "Quick View" Match Preview */}
                <div className="lg:w-[350px] shrink-0">
                    <div className="bg-pitch-card border border-white/10 rounded-sm shadow-xl sticky top-32">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <h2 className="font-heading text-xl font-bold italic uppercase flex items-center gap-2">
                                <Users className="w-5 h-5 text-pitch-accent" /> Match Preview
                            </h2>
                        </div>

                        <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                            {teams.map(team => {
                                const teamPlayers = bookings.filter(b => b.team_assignment === team.name);

                                // Header Style
                                let headerColor = 'text-white';
                                if (team.color === 'Neon Orange') headerColor = 'text-orange-500';
                                if (team.color === 'Neon Blue') headerColor = 'text-cyan-400';
                                if (team.color === 'Neon Green') headerColor = 'text-[#ccff00]';
                                if (team.color === 'Red') headerColor = 'text-red-500';
                                if (team.color === 'Yellow') headerColor = 'text-yellow-400';

                                return (
                                    <div key={team.name}>
                                        <h3 className={cn("font-bold uppercase text-sm mb-2 border-b border-white/10 pb-1", headerColor)}>
                                            {team.name} ({teamPlayers.length})
                                        </h3>
                                        <ul className="space-y-1">
                                            {teamPlayers.length > 0 ? (
                                                teamPlayers.map(p => {
                                                    const profilesData = p.profiles;
                                                    const profile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
                                                    const name = profile?.full_name || profile?.email || 'Unknown';
                                                    return (
                                                        <li key={p.id} className="text-sm text-gray-300 flex items-center gap-2">
                                                            {p.checked_in && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Checked In" />}
                                                            <span className="truncate">{name}</span>
                                                        </li>
                                                    )
                                                })
                                            ) : (
                                                <li className="text-xs text-gray-600 italic">Empty</li>
                                            )}
                                        </ul>
                                    </div>
                                )
                            })}

                            {/* Unassigned */}
                            <div>
                                <h3 className="font-bold uppercase text-sm mb-2 border-b border-white/10 pb-1 text-gray-500">
                                    Unassigned / Bench
                                </h3>
                                <ul className="space-y-1">
                                    {bookings.filter(b => !b.team_assignment).map(p => {
                                        const profilesData = p.profiles;
                                        const profile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
                                        const name = profile?.full_name || profile?.email || 'Unknown';
                                        return (
                                            <li key={p.id} className="text-sm text-gray-500 flex items-center gap-2">
                                                {p.checked_in && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Checked In" />}
                                                <span className="truncate">{name}</span>
                                            </li>
                                        )
                                    })}
                                    {bookings.filter(b => !b.team_assignment).length === 0 && (
                                        <li className="text-xs text-gray-700 italic">No unassigned players</li>
                                    )}
                                </ul>
                            </div>

                        </div>
                    </div>
                </div>

            </div>

            {/* Modals */}
            <ConfirmationModal
                isOpen={showFinalizeModal}
                title="Finalize Match?"
                message="This will mark the match as completed, update stats, and lock the scores. You can re-open it later if needed."
                onConfirm={confirmFinalize}
                onClose={() => setShowFinalizeModal(false)}
                confirmText={finalizing ? "Finalizing..." : "Yes, Finalize"}
                isDestructive={false}
            />

            <ConfirmationModal
                isOpen={showCancelModal}
                title="Cancel Event?"
                message="This will mark the event as cancelled. Players will be notified (if implemented) and refunds may be required."
                onConfirm={confirmCancel}
                onClose={() => setShowCancelModal(false)}
                confirmText="Yes, Cancel Event"
                isDestructive={true}
            />

            <ConfirmationModal
                isOpen={showDeleteModal}
                title="DELETE EVENT?"
                message="Are you sure you want to PERMANENTLY DELETE this event? This action cannot be undone. All bookings and match data will be erased."
                onConfirm={confirmDelete}
                onClose={() => setShowDeleteModal(false)}
                confirmText="PERMANENTLY DELETE"
                isDestructive={true}
            />
        </div>
    );
}
