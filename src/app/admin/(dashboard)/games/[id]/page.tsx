'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Check, Shirt, User as UserIcon, Users, X, Trophy, Save, Loader2, Swords, Calendar, Trash2, Shield, MoreVertical, MonitorPlay, UserCheck, UserX, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { MatchManager } from '@/components/admin/MatchManager';
import { StandingsTable } from '@/components/admin/StandingsTable';
import { ScheduleGenerator } from '@/components/admin/ScheduleGenerator';
import { MicroTournamentManager } from '@/components/admin/MicroTournamentManager';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLeagueControl } from '@/components/admin/AdminLeagueControl';

interface Booking {
    id: string;
    checked_in: boolean;
    team_assignment: string | null;
    team: 'A' | 'B' | null; // NEW FIELD
    note: string | null; // Request note
    prize_split_preference?: string | null;
    user_id: string;
    payment_status: 'unpaid' | 'pending' | 'verified' | 'refunded';
    payment_method: string | null;
    payment_amount: number;
    roster_status?: string;
    created_at?: string;
    profiles: {
        id: string; // Add id
        email: string;
        full_name: string;
    } | {
        id: string; // Add id
        email: string;
        full_name: string;
    }[] | null;
    status: string; // Add status explicitly to interface
    has_signed?: boolean;
}

import { TeamManager } from '@/components/admin/TeamManager';
import { generatePlayoffs } from '@/app/actions/tournament';

interface TeamConfig {
    id?: string;
    name: string;
    color: string;
}

interface Game {
    id: string;
    title: string;
    start_time: string;
    price: number;
    facility_id?: string | null;
    resource_id?: string | null;
    is_league?: boolean;
    total_weeks?: number;
    team_roster_fee?: number | null;
    teams_config: TeamConfig[] | null;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    event_type?: string;
    roster_freeze_date?: string | null;
    end_time?: string;
    match_style?: string;
    prize_pool_percentage?: number | null;
    home_score: number;
    away_score: number;
    mvp_player_id: string | null;
    refund_processed: boolean;
    max_players: number;
    score_team_a?: number | null;
    score_team_b?: number | null;
    host_ids?: string[];
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
    tournament_stage?: string;
    timer_status?: 'stopped' | 'running' | 'paused';
    timer_started_at?: string | null;
    paused_elapsed_seconds?: number;
    field_name?: string;
    is_playoff?: boolean;
    group_name?: string;
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

const HEX_COLOR_MAP: Record<string, string> = {
    'Neon Orange': '#ff4f00',
    'Neon Blue': '#00ccff',
    'Neon Green': '#ccff00',
    'White': '#ffffff',
    'Black': '#333333',
    'Red': '#ef4444',
    'Yellow': '#eab308',
    'Light Blue': '#60a5fa',
    'Pink': '#ec4899',
    'Purple': '#a855f7',
    'Blue': '#2563eb',
    'Grey': '#6b7280'
};

export default function RosterPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const gameId = resolvedParams.id;
    const { success, error: toastError } = useToast();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [game, setGame] = useState<Game | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [finalizing, setFinalizing] = useState(false);

    // Current User tracking for Host vs Admin permissions
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [currentUserId, setCurrentUserId] = useState<string>('');

    // Match Control States
    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [matchStatus, setMatchStatus] = useState<'scheduled' | 'active' | 'completed' | 'cancelled'>('scheduled');
    const [mvpId, setMvpId] = useState<string>('');

    // View Mode
    const [viewMode, setViewMode] = useState<'single' | 'king' | 'tournament'>('single');
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

    const [isExecutingShortfalls, setIsExecutingShortfalls] = useState(false);

    const handleExecuteShortfalls = async () => {
        if (!confirm("Are you sure you want to execute escrow shortfalls? This will permanently charge the vaulted cards of League Captains whose rosters have not met their minimum roster fees.")) return;
        setIsExecutingShortfalls(true);
        try {
            const { executeEscrowShortfalls } = await import('@/app/actions/execute-shortfalls');
            const result = await executeEscrowShortfalls(gameId);
            if (result.success) {
                success(result.message || "Shortfalls executed successfully.");
                router.refresh(); // Refresh to catch any new native Stripe charges logged
            } else {
                toastError(result.error || "Failed to execute shortfalls");
            }
        } catch (err: any) {
            toastError(err.message || 'Error occurred');
        } finally {
            setIsExecutingShortfalls(false);
        }
    };

    const handleGeneratePlayoffs = async () => {
        if (!confirm('Are you sure you want to lock the Standings and produce the Knockout Phase Matches?')) return;
        try {
            const res = await generatePlayoffs(gameId);
            toast.success(res.message);
            fetchMatches();
            setRefreshKey(prev => prev + 1);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const supabase = createClient();
    const router = useRouter();
    const toast = useToast();

    const fetchMatches = async () => {
        const res = await fetch(`/api/matches?gameId=${gameId}`);
        const result = await res.json();
        const matchesData = result.data || [];

        setMatches(matchesData);

        // Auto-switch to king mode if matches exist and no mode set
        if (matchesData.length > 0 && viewMode === 'single') {
            setViewMode('king');
        }
    }

    const [voteTally, setVoteTally] = useState<Record<string, number>>({});

    const handleViewModeChange = async (mode: 'single' | 'king' | 'tournament') => {
        setViewMode(mode);
        await supabase.from('games').update({ view_mode: mode }).eq('id', gameId);
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            let fetchedGame: any = null;
            try {
                // Fetch Game
                const { data: gameData, error: gameError } = await supabase
                    .from('games')
                    .select('*, teams_config')
                    .eq('id', gameId)
                    .single();

                if (gameError) throw gameError;
                fetchedGame = gameData;
                setGame(gameData);

                if (gameData.view_mode) {
                    setViewMode(gameData.view_mode as any);
                } else if (gameData.event_type === 'tournament' || gameData.event_type === 'league') {
                    setViewMode('tournament');
                }

                // Fetch User and Role
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setCurrentUserId(user.id);
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    if (profile) setCurrentUserRole(profile.role);
                }

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
                let finalBookings: any[] = [];
                
                if (fetchedGame?.event_type === 'tournament' || fetchedGame?.event_type === 'league') {
                    // 1. Fetch Registrations
                    const { data: regData, error: regError } = await supabase
                        .from('tournament_registrations')
                        .select('*')
                        .eq('game_id', gameId);
                        
                    if (regError) {
                        console.error("[CRITICAL] Failed to fetch tournament_registrations:", regError);
                    }

                    if (regData && regData.length > 0) {
                        const userIds = regData.map(r => r.user_id);
                        const teamIds = regData.map(r => r.team_id).filter(Boolean);

                        // 2. Fetch Profiles and Teams in parallel (only if IDs exist)
                        const [profilesRes, teamsRes] = await Promise.all([
                            userIds.length > 0 
                                ? supabase.from('profiles').select('email, full_name, id, avatar_url').in('id', userIds)
                                : Promise.resolve({ data: [], error: null }),
                            teamIds.length > 0 
                                ? supabase.from('teams').select('id, name, captain_id').in('id', teamIds)
                                : Promise.resolve({ data: [], error: null })
                        ]);

                        if (profilesRes.error) {
                            console.error("[CRITICAL] Failed to fetch profiles for roster:", JSON.stringify(profilesRes.error, null, 2));
                        }
                        if (teamsRes.error) {
                            console.error("[CRITICAL] Failed to fetch teams for roster:", JSON.stringify(teamsRes.error, null, 2));
                        }

                        finalBookings = regData.map((r: any) => {
                            const profile = profilesRes.data?.find(p => p.id === r.user_id);
                            const team = teamsRes.data?.find(t => t.id === r.team_id);

                            return {
                                id: r.id || `reg_${r.user_id}`,
                                user_id: r.user_id,
                                team_id: r.team_id,
                                role: r.role,
                                team_assignment: team?.name || 'Unassigned',
                                team_color: r.team_color, // Use the color from the registration table
                                has_signed: r.has_signed,
                                checked_in: r.checked_in,
                                status: r.status === 'registered' ? 'paid' : r.status,
                                payment_status: r.payment_status || 'verified',
                                payment_amount: 0,
                                payment_error: r.payment_error,
                                profiles: profile || null,
                                teams: team ? { name: team.name } : null,
                                created_at: r.created_at
                            };
                        });
                    }
                } else {
                    const { data: bookingsData, error: bookingsError } = await supabase
                        .from('bookings')
                        .select('*, profiles!bookings_user_id_fkey(email, full_name, id, avatar_url)')
                        .eq('game_id', gameId)
                        .order('created_at', { ascending: true });
    
                    if (bookingsError) throw bookingsError;
                    finalBookings = bookingsData || [];
                }

                let signedIds = new Set<string>();
                if (fetchedGame?.facility_id && finalBookings.length > 0) {
                    const userIds = finalBookings.map((b: any) => b.user_id);
                    const { data: waiverData } = await supabase
                        .from('waiver_signatures')
                        .select('user_id')
                        .eq('facility_id', fetchedGame.facility_id)
                        .in('user_id', userIds);
                    signedIds = new Set(waiverData?.map((w: any) => w.user_id) || []);
                }

                const enrichedBookings = finalBookings.map((b: any) => ({
                    ...b,
                    has_signed: signedIds.has(b.user_id)
                }));

                setBookings(enrichedBookings as any);

                // Fetch Votes
                const { data: votesData, error: votesError } = await supabase
                    .from('mvp_votes')
                    .select('candidate_id')
                    .eq('game_id', gameId);

                if (votesData) {
                    const tally: Record<string, number> = {};
                    votesData.forEach(v => {
                        tally[v.candidate_id] = (tally[v.candidate_id] || 0) + 1;
                    });
                    setVoteTally(tally);
                }

            } catch (err) {
                console.error("Error fetching roster/votes:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Realtime Subscription for Votes
        const voteChannel = supabase
            .channel(`mvp-votes-${gameId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all changes (INSERT)
                    schema: 'public',
                    table: 'mvp_votes',
                    filter: `game_id=eq.${gameId}`
                },
                (payload) => {
                    // Re-fetch votes to be safe and simple (or optimistic update)
                    // Simple re-fetch logic:
                    supabase
                        .from('mvp_votes')
                        .select('candidate_id')
                        .eq('game_id', gameId)
                        .then(({ data }) => {
                            if (data) {
                                const tally: Record<string, number> = {};
                                data.forEach(v => {
                                    tally[v.candidate_id] = (tally[v.candidate_id] || 0) + 1;
                                });
                                setVoteTally(tally);
                            }
                        });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(voteChannel);
        };
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

    const togglePaymentStatus = async (bookingId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'verified' ? 'pending' : 'verified';
        // Optimistic
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, payment_status: newStatus } : b));

        try {
            const { error } = await supabase.from('bookings').update({ payment_status: newStatus }).eq('id', bookingId);
            if (error) throw error;
            toast.success(`Payment marked as ${newStatus}`);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message);
            // Revert
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, payment_status: currentStatus as any } : b));
        }
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
            const response = await fetch(`/api/games/${gameId}`, {
                method: 'DELETE',
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to delete game');

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

    const isAdmin = currentUserRole === 'admin' || currentUserRole === 'master_admin';

    const gameDate = new Date(game.start_time);
    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const startTimeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // FIX: Time Range Bug - Parse actual end_time from database if it exists
    let endTimeStr = 'TBD';
    if (game.end_time) {
        if (game.end_time.includes('T')) {
            endTimeStr = new Date(game.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else {
            const [h, m] = game.end_time.split(':');
            const tempDate = new Date();
            tempDate.setHours(Number(h), Number(m));
            endTimeStr = tempDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }
    } else {
        const endDate = new Date(gameDate.getTime() + 90 * 60000);
        endTimeStr = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    // Default teams if none config (fallback)
    const teams = game.teams_config || [
        { name: 'Team A', color: 'Neon Orange' },
        { name: 'Team B', color: 'White' }
    ];

    // Split Bookings Strict
    const validBookings = bookings.filter(b => b.status !== 'cancelled' && b.roster_status !== 'dropped');

    // ACTIVE ROSTER: Status precisely equals 'confirmed', or legacy fallbacks 'paid' / 'active'
    const roster = validBookings.filter(b => ['confirmed', 'paid', 'active'].includes(b.status) || b.roster_status === 'confirmed');

    // WAITLIST QUEUE: Status precisely equals 'waitlisted', or legacy fallbacks 'waitlist'
    const waitlist = validBookings.filter(b => ['waitlisted', 'waitlist'].includes(b.status) || b.roster_status === 'waitlisted')
        .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

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

    const handleKick = async (userId: string, playerName: string) => {
        if (!confirm(`Are you sure you want to kick ${playerName} from this game? If space opens up, the next waitlisted player will be automatically promoted.`)) return;

        setLoading(true);
        try {
            const response = await fetch('/api/kick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId, targetUserId: userId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to kick player');

            toast.success("Player removed. Remember to manually refund their Venmo/Zelle payment if applicable.");
            router.refresh();
            // Optimistic removal from view
            setBookings(prev => prev.filter(b => b.user_id !== userId));

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // CANCELLATION SUMMARY VIEW
    if (matchStatus === 'cancelled') {
        return (
            <div className="min-h-screen bg-pitch-black text-white p-6 pt-8 font-sans overflow-x-hidden pb-40">
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
                                        <th className="p-4">Status / Payment</th>
                                        <th className="p-4 text-right">Amount</th>
                                        <th className="p-4 text-right">Verify</th>
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

                                        const paymentStatus = booking.payment_status || 'unpaid';
                                        const isPending = paymentStatus === 'pending';
                                        const isVerified = paymentStatus === 'verified';
                                        const method = booking.payment_method;

                                        return (
                                            <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-bold">{name}</td>
                                                <td className="p-4 text-sm text-gray-400">{email}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={cn(
                                                            "text-[10px] font-bold uppercase w-fit px-2 py-0.5 rounded",
                                                            isActive ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
                                                        )}>
                                                            {isActive ? "Promoted" : "Joined"}
                                                        </span>
                                                        <span className={cn(
                                                            "text-[10px] font-bold uppercase w-fit px-2 py-0.5 rounded border",
                                                            isPending ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" :
                                                                isVerified ? "bg-green-500/10 text-green-500 border-green-500/30" : "bg-gray-800 text-gray-400 border-gray-700"
                                                        )}>
                                                            {isPending ? "Pending" : isVerified ? "Paid" : "Unpaid"}
                                                            {method && ` (${method})`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-mono text-gray-400">
                                                    {isPaid ? `$${game.price}` : '$0.00'}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {(isPending || isVerified) && (
                                                        <button
                                                            onClick={() => togglePaymentStatus(booking.id, paymentStatus)}
                                                            className={cn(
                                                                "p-2 rounded hover:bg-white/10 transition-colors inline-flex justify-center",
                                                                isVerified ? "text-green-500" : "text-yellow-500 animate-pulse"
                                                            )}
                                                            title="Toggle Verification"
                                                        >
                                                            <div className="border border-current rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">$</div>
                                                        </button>
                                                    )}
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

    if (game.event_type === 'league') {
        return (
            <div className="min-h-screen bg-pitch-black text-white p-6 pt-8 font-sans overflow-x-hidden pb-40">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <Link href="/admin" className="flex items-center text-pitch-secondary hover:text-white mb-2 transition-colors">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                            </Link>
                            <h1 className="font-heading text-3xl md:text-4xl font-bold italic uppercase tracking-tighter">
                                <span className="text-pitch-accent">{game.title}</span> <span className="text-white/20">League Control</span>
                            </h1>
                        </div>
                    </div>

                    <AdminLeagueControl 
                        leagueId={gameId}
                        leagueTitle={game.title}
                        rosterFreezeDate={game.roster_freeze_date || null}
                        registrations={bookings as any}
                        matches={matches}
                        teams={teams as any}
                        facilityId={game.facility_id || ''}
                        startDate={game.start_time}
                        isLeagueCompleted={game.status === 'completed'}
                        onRefresh={() => {
                            fetchMatches();
                            router.refresh();
                        }}
                    />
                </div>
            </div>
        );
    }

    if (game.event_type === 'tournament') {
        return (
            <MicroTournamentManager 
                game={game} 
                bookings={bookings} 
                matches={matches}
                onUpdate={() => {
                    fetchMatches();
                    router.refresh();
                }} 
            />
        );
    }

    return (
        <div className="min-h-screen bg-pitch-black text-white p-6 pt-8 font-sans overflow-x-hidden pb-40">
            <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">

                {/* LEFT COLUMN: Main Roster Manager */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <Link href="/admin" className="flex items-center text-pitch-secondary hover:text-white mb-2 transition-colors">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                            </Link>
                            <h1 className="font-heading text-3xl md:text-4xl font-bold italic uppercase tracking-tighter">
                                <span className="text-pitch-accent">{game.title}</span>
                            </h1>
                            <div className="flex items-center gap-3">
                                <p className="text-pitch-secondary">{dateStr} • {startTimeStr} - {endTimeStr} • <span className={cn("uppercase font-bold", matchStatus === 'completed' ? 'text-green-500' : 'text-yellow-500')}>{matchStatus}</span></p>
                                <span className="text-sm font-bold bg-white/10 px-2 py-1 rounded text-white flex items-center gap-2">
                                    <Users className="w-4 h-4" /> {roster.length} / {game.max_players} Players
                                </span>
                            </div>
                        </div>

                        {/* Cancel Button */}
                        {isAdmin && (
                            <div className="flex items-center">
                                {/* Desktop View */}
                                <div className="hidden md:flex gap-2">
                                    {matchStatus !== 'completed' && (matchStatus as string) !== 'cancelled' && (
                                        <button
                                            onClick={onCancelClick}
                                            className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded uppercase font-bold text-xs tracking-wider transition-colors"
                                        >
                                            Cancel Event
                                        </button>
                                    )}
                                </div>
                                {/* Mobile Dropdown View */}
                                <div className="md:hidden">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="p-2 border border-white/10 rounded bg-white/5 data-[state=open]:bg-white/10 transition-colors">
                                            <MoreVertical className="w-5 h-5 text-white" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            {matchStatus !== 'completed' && (matchStatus as string) !== 'cancelled' && (
                                                <DropdownMenuItem className="text-red-500 font-bold uppercase tracking-wider justify-between" onClick={onCancelClick}>
                                                    Cancel Event <X className="w-4 h-4 ml-2" />
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Host Management */}
                    {isAdmin && (
                        <div className="bg-pitch-card border border-white/10 p-4 rounded-sm mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div>
                                <h3 className="font-heading text-lg font-bold italic uppercase flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-pitch-accent" /> Manage Hosts
                                </h3>
                                <p className="text-xs text-gray-400">Hosts can manage the roster and chat, but cannot delete the event or change core details.</p>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <select
                                    className="bg-black/30 w-full md:w-48 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-pitch-accent"
                                    onChange={async (e) => {
                                        const uid = e.target.value;
                                        if (!uid) return;
                                        const currentHosts = game.host_ids || [];
                                        if (currentHosts.includes(uid)) return;

                                        const newHosts = [...currentHosts, uid];
                                        setGame({ ...game, host_ids: newHosts });

                                        try {
                                            const { error } = await supabase.from('games').update({ host_ids: newHosts }).eq('id', game.id);
                                            if (error) throw error;
                                            toast.success("Host added.");
                                        } catch (err: any) {
                                            toast.error(err.message);
                                            setGame({ ...game, host_ids: currentHosts }); // Revert
                                        }
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">+ Assign Host</option>
                                    {playerOptions.filter(p => !(game.host_ids || []).includes(p.id)).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <Tabs defaultValue="player-manager" className="w-full">
                        <TabsList className="bg-black/40 border border-white/10 mb-6 h-12 flex w-full max-w-sm ml-0">
                            <TabsTrigger value="player-manager" className="flex-1">Player Manager</TabsTrigger>
                            <TabsTrigger value="game-management" className="flex-1">Game Management</TabsTrigger>
                        </TabsList>

                        {/* TAB 1: PLAYER MANAGER */}
                        <TabsContent value="player-manager" className="mt-0">
                            {/* Live Counters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {teams.map(team => {
                                    const count = teamCounts[team.name] || 0;
                                    const limit = (team as any).limit || 11;
                                    const isFull = count >= limit;
                                    const percentage = Math.min(100, (count / limit) * 100);

                                    // Determine bar color based on team config
                                    const barHex = HEX_COLOR_MAP[team.color] || '#3b82f6'; // Default blue-500

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
                                                    className="h-full transition-all duration-500"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: barHex
                                                    }}
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
                                        <div className="col-span-2 text-center border-l border-white/5">Payment</div>
                                        <div className="col-span-2 text-center border-l border-white/5">Check In</div>
                                        <div className="col-span-4 text-center border-l border-white/5">Team Assignment</div>
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
                                                    <div className="w-full md:col-span-4 flex items-center justify-between md:justify-start gap-3">
                                                        <div className="flex items-center gap-3 w-full">
                                                            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 shrink-0">
                                                                <UserIcon className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-bold truncate text-sm">{displayName}</div>
                                                                {game.facility_id && (
                                                                    <div className="text-[10px] uppercase font-bold tracking-wider mt-1 mb-1">
                                                                        {booking.has_signed ? (
                                                                            <span className="text-green-400 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Waiver Verified</span>
                                                                        ) : (
                                                                            <span className="text-red-400 flex items-center gap-1.5"><UserX className="w-3.5 h-3.5" /> Action Req: Waiver</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {booking.note && (
                                                                    <div className="text-[10px] text-pitch-accent italic truncate max-w-[200px] md:max-w-[120px]">
                                                                        Request: {booking.note}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="md:hidden">
                                                            <button
                                                                onClick={() => handleKick(booking.user_id, displayName)}
                                                                className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all shrink-0"
                                                                title="Kick Player"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Mobile: Controls Row */}
                                                    <div className="w-full flex flex-wrap items-center justify-between gap-y-3 md:contents mt-2 md:mt-0">

                                                        {/* Payment Status - Mobile & Desktop */}
                                                        <div className="w-1/3 md:w-auto md:col-span-2 flex justify-start md:justify-center md:border-l md:border-white/5 pl-0 md:pl-2">
                                                            <button
                                                                onClick={() => togglePaymentStatus(booking.id, booking.payment_status || 'unpaid')}
                                                                className={cn(
                                                                    "px-3 py-1 rounded text-[10px] font-bold uppercase w-full md:w-auto h-8 flex items-center justify-center gap-2 transition-all",
                                                                    booking.payment_status === 'verified'
                                                                        ? "bg-green-500/10 text-green-500 border border-green-500/50"
                                                                        : booking.payment_status === 'pending'
                                                                            ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 animate-pulse"
                                                                            : "bg-red-500/10 text-red-500 border border-red-500/50"
                                                                )}
                                                                title={`Payment: ${booking.payment_status || 'unpaid'}`}
                                                            >
                                                                <span className="md:hidden">Pay: </span>
                                                                <span>{booking.payment_status === 'verified' ? 'PAID' : booking.payment_status === 'pending' ? 'PEND' : 'UNP'}</span>
                                                            </button>
                                                        </div>

                                                        {/* Check In */}
                                                        <div className="w-1/3 md:w-auto md:col-span-2 flex justify-center md:border-l md:border-white/5 pl-2 gap-2">
                                                            <label className="text-xs font-bold uppercase text-gray-500 md:hidden flex items-center">In:</label>
                                                            <Switch
                                                                checked={booking.checked_in}
                                                                onCheckedChange={() => toggleCheckIn(booking.id, booking.checked_in)}
                                                                className={booking.checked_in ? "bg-green-500" : "bg-gray-600"}
                                                            />
                                                        </div>

                                                        {/* Team Select - Flex Wrap for Mobile */}
                                                        <div className="w-full md:w-auto flex-1 flex items-center gap-2 flex-wrap md:col-span-3 md:border-l md:border-white/5 pl-0 md:pl-4">
                                                            <Select value={booking.team_assignment || "none"} onValueChange={(val) => assignTeam(booking.id, val === "none" ? null as any : val)}>
                                                                <SelectTrigger className="h-8 max-w-[160px] md:max-w-full">
                                                                    <SelectValue placeholder="Assign Team" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">Unassigned</SelectItem>
                                                                    {teams.map(team => (
                                                                        <SelectItem key={team.name} value={team.name}>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: HEX_COLOR_MAP[team.color] || '#ffffff' }} />
                                                                                {team.name}
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* Kick Player - Desktop Only (Mobile is alongside Name) */}
                                                        <div className="hidden md:flex md:col-span-1 justify-end">
                                                            <button
                                                                onClick={() => handleKick(booking.user_id, displayName)}
                                                                className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all shrink-0"
                                                                title="Kick Player"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
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
                                    <div className="bg-amber-950/20 border border-yellow-500/20 rounded-sm shadow-xl overflow-hidden mt-8">
                                        <div className="p-4 border-b border-yellow-500/10 bg-yellow-500/5 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-yellow-500" />
                                            <h3 className="font-bold uppercase text-sm text-yellow-500 tracking-wider">Waitlist ({waitlist.length})</h3>
                                        </div>
                                        <div className="divide-y divide-yellow-500/5">
                                            {waitlist.map((booking: any) => {
                                                const profilesData = booking.profiles;
                                                const profile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
                                                const displayName = profile?.full_name || profile?.email || 'Unknown Player';

                                                return (
                                                    <div key={booking.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 hover:bg-yellow-500/5 gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-gray-500 shrink-0">
                                                                <UserIcon className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold truncate text-sm text-yellow-100">{displayName}</div>
                                                                <div className="flex gap-2">
                                                                    <span className="text-[10px] uppercase tracking-wider font-bold bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded border border-gray-500/30 mt-1 inline-block">Waitlisted</span>
                                                                    {booking.note && <span className="text-[10px] text-pitch-accent italic mt-1 inline-block truncate max-w-[120px]">Request: {booking.note}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                                            <button
                                                                onClick={() => promotePlayer(booking.id)}
                                                                className="text-xs w-full md:w-auto justify-center bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-black font-bold uppercase px-6 py-2 rounded transition-colors"
                                                            >
                                                                Promote
                                                            </button>
                                                            <button
                                                                onClick={() => handleKick(booking.user_id, displayName)}
                                                                className="w-10 h-10 rounded shrink-0 flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors"
                                                                title="Kick from Waitlist"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* TAB 2: GAME MANAGEMENT */}
                        <TabsContent value="game-management" className="mt-0">



                            {/* TEAM BALANCING SECTION (Moved Here) */}
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
                                        status: b.status,
                                        payment_status: b.payment_status
                                    }))}
                                    onUpdate={() => router.refresh()}
                                    onVerifyPayment={togglePaymentStatus}
                                />
                            </div>

                            {/* LEAGUE PAYMENTS & ESCROW */}
                            {game.event_type === 'league' && (
                                <div className="bg-gradient-to-br from-pitch-card to-blue-900/10 border border-blue-500/20 p-6 rounded-sm mb-8 shadow-xl">
                                    <h2 className="font-heading text-xl font-bold italic uppercase flex items-center gap-2 mb-4 text-blue-400">
                                        <Shield className="w-5 h-5 text-blue-500" /> League Payments & Escrow
                                    </h2>
                                    <p className="text-sm text-gray-300 mb-6">
                                        League Capatins who vaulted their card for a deposit are liable for any missing <strong>Team Roster Fee</strong> balance. 
                                        Execute shortfalls after the roster lock deadline to auto-charge their cards for the difference.
                                    </p>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleExecuteShortfalls}
                                            disabled={isExecutingShortfalls || !game.team_roster_fee}
                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider rounded-sm transition-colors disabled:opacity-50"
                                        >
                                            {isExecutingShortfalls ? 'Executing...' : 'Execute Escrow Shortfalls'}
                                        </button>
                                    </div>
                                    {!game.team_roster_fee && (
                                        <p className="text-xs text-red-400 mt-2 text-right italic">Action disabled: No Team Roster Fee configured for this League.</p>
                                    )}
                                </div>
                            )}



                            {/* MODE TOGGLES REMOVED - LOCKED TO DATABASE STATE */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                                <div className="flex items-center gap-4 overflow-x-auto">
                                    <h3 className="text-xl font-bold uppercase italic flex items-center gap-2 text-pitch-accent">
                                        <Trophy className="w-5 h-5" /> Game Management ({game.match_style || 'Full Length'})
                                    </h3>
                                </div>
                                <button
                                    onClick={() => window.open(`/games/${gameId}/live`, '_blank')}
                                    className="hidden md:flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold uppercase rounded border border-white/10 transition-colors whitespace-nowrap"
                                >
                                    <MonitorPlay className="w-4 h-4 text-pitch-accent" />
                                    Launch Projector View
                                </button>
                            </div>


                            {(!game.match_style || game.match_style === 'Full Length') && (
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
                                        {false && (
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
                                        )}

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
                            )}

                            {(game.match_style === 'King' || game.match_style === 'Tourney') && (
                                /* KING OF THE COURT (MANUAL & LIST) */
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <MatchManager
                                        game={game}
                                        bookings={bookings}
                                        onUpdate={handleMatchUpdate}
                                        filterMode="king"
                                    />
                                    <StandingsTable
                                        key={refreshKey} // Force re-mount/re-fetch on update
                                        gameId={gameId}
                                        teams={teams as TeamConfig[]}
                                        matches={matches}
                                    />
                                </div>
                            )}

                            {false && (
                                /* TOURNAMENT (AUTO-SCHEDULER) */
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    {!matches.some(m => m.round_number > 0) && (
                                        <ScheduleGenerator
                                            gameId={gameId}
                                            teams={teams as TeamConfig[]}
                                            isLeague={game?.is_league || false}
                                            totalWeeks={game?.total_weeks || 4}
                                            onScheduleSaved={() => {
                                                fetchMatches();
                                                setRefreshKey(prev => prev + 1);
                                            }}
                                        />
                                    )}
                                    <MatchManager
                                        key={`tournament-${refreshKey}`}
                                        game={game}
                                        bookings={bookings}
                                        onUpdate={handleMatchUpdate}
                                        filterMode="tournament"
                                    />
                                    {matches.some(m => m.round_number > 0) && (
                                        <>
                                            <StandingsTable
                                                key={`standings-${refreshKey}`}
                                                gameId={gameId}
                                                teams={teams as TeamConfig[]}
                                                matches={matches}
                                            />

                                            {/* PLAYOFF GENERATOR TRIGGER */}
                                            <div className="flex justify-end pt-4 border-t border-white/10 mt-6">
                                                <button
                                                    onClick={handleGeneratePlayoffs}
                                                    className="px-6 py-3 bg-pitch-accent hover:bg-white text-black font-bold uppercase rounded-sm flex items-center gap-2 transition-colors"
                                                >
                                                    <Trophy className="w-5 h-5" /> Generate Playoffs
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* RIGHT COLUMN: "Quick View" Match Preview - SUPPRESSED per user request (redundant with TeamManager) */}
                {/* <div className="lg:w-[350px] shrink-0">
                    <div className="bg-pitch-card border border-white/10 rounded-sm shadow-xl sticky top-32">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <h2 className="font-heading text-xl font-bold italic uppercase flex items-center gap-2">
                                <Users className="w-5 h-5 text-pitch-accent" /> Match Preview
                            </h2>
                        </div>
                        <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                           
                        </div>
                    </div>
                </div> */}

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
