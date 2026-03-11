'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Clock, Users, MessageSquare, Info, Shirt, DollarSign, Award, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/ChatInterface';
import { VotingModal } from '@/components/VotingModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Trophy, AlertTriangle, Crown } from 'lucide-react';
import { FreeAgentCard } from '@/components/FreeAgentCard';
import { draftFreeAgent } from '@/app/actions/draft-free-agent';
import { cancelPlayerRegistration } from '@/app/actions/cancel-player-registration';
import { GameMap } from '@/components/GameMap';
import { StandingsTable } from '@/components/admin/StandingsTable';
import { JoinGameModal } from '@/components/JoinGameModal';

// Reuse types/interfaces if possible, or define locally for now
interface Game {
    id: string;
    title: string;
    location_name?: string;
    location: string;
    latitude?: number;
    longitude?: number;
    start_time: string;
    end_time: string | null;
    price: number;
    max_players: number;
    current_players: number;
    surface_type: string;
    facility_id?: string | null;
    resource_id?: string | null;
    status: string;
    game_format?: string;
    description?: string;
    reward?: string;
    prize_type?: string;
    fixed_prize_amount?: number;
    prize_pool_percentage?: number;
    roster_lock_date?: string;
    refund_cutoff_date?: string;
    strict_waiver_required?: boolean;
    mercy_rule_cap?: number;
    teams_config?: { name: string; color: string }[];
    event_type?: string;
}

interface Booking {
    id: string;
    status: string;
    roster_status?: string;
    created_at?: string;
    user_id: string;
    team_assignment?: string;
    profiles: {
        full_name: string;
        email: string;
    } | null;
}

export default function GameDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const gameId = resolvedParams.id;
    const [activeTab, setActiveTab] = useState<'details' | 'roster' | 'chat' | 'tournament-hub'>('details');
    const [game, setGame] = useState<Game | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [matches, setMatches] = useState<any[]>([]); // NEW: Tournament matches
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [voteModalOpen, setVoteModalOpen] = useState(false);
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joinLoading, setJoinLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);

    const [isParticipant, setIsParticipant] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [userBooking, setUserBooking] = useState<any>(null);
    const [hasUnreadChat, setHasUnreadChat] = useState(false);

    const [hasVoted, setHasVoted] = useState(false);
    const [isVotingOpen, setIsVotingOpen] = useState(false);
    const [isSubmittingVote, setIsSubmittingVote] = useState(false);

    // League Captain State
    const [isCaptain, setIsCaptain] = useState(false);
    const [customInviteFee, setCustomInviteFee] = useState<number | ''>('');
    const [isSavingFee, setIsSavingFee] = useState(false);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchGameData = async () => {
            setLoading(true);

            // 1. Get User
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setUserProfile(profile);
            }

            // 2. Get Game
            const { data: gameData, error: gameError } = await supabase
                .from('games')
                .select('*')
                .eq('id', gameId)
                .single();

            if (gameError) {
                console.error('Error fetching game:', gameError);
                setLoading(false);
                return;
            }
            setGame(gameData);

            // Check if voting is open (Now > Start Time)
            const now = new Date();
            const start = new Date(gameData.start_time);
            setIsVotingOpen(now >= start);

            // 2.5 Get Matches (If Tournament)
            if (gameData.event_type === 'tournament') {
                const { data: matchesData } = await supabase
                    .from('matches')
                    .select('*')
                    .eq('game_id', gameId)
                    .order('created_at', { ascending: true });
                setMatches(matchesData || []);
            }

            // 3. Get Roster (Active/Paid/Waitlist)
            const { data: rosterData, error: rosterError } = await supabase
                .from('bookings')
                .select('*, profiles(id, full_name, email)')
                .eq('game_id', gameId)
                .neq('status', 'cancelled');

            if (rosterError) {
                console.error('Error fetching roster:', rosterError);
            } else {
                setBookings(rosterData as any);

                // Check participation
                if (user) {
                    const myBooking = rosterData.find((b: any) => b.user_id === user.id);
                    if (myBooking && ['active', 'paid'].includes(myBooking.status)) {
                        setIsParticipant(true);
                        setUserBooking(myBooking);

                        // Check for unread messages
                        const { data: latestMsg } = await supabase
                            .from('messages')
                            .select('created_at')
                            .eq('event_id', gameId)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (latestMsg && (!myBooking.last_read_at || new Date(latestMsg.created_at) > new Date(myBooking.last_read_at))) {
                            setHasUnreadChat(true);
                        }

                        // Check if user has voted
                        const { data: voteData } = await supabase
                            .from('mvp_votes')
                            .select('id')
                            .eq('game_id', gameId)
                            .eq('voter_id', user.id)
                            .maybeSingle();

                        if (voteData) setHasVoted(true);
                    } else if (myBooking && myBooking.status === 'waitlist') {
                        // Waitlist logic (keep existing)
                        setIsParticipant(true);
                        setUserBooking(myBooking);

                        // Check for unread messages
                        const { data: latestMsg } = await supabase
                            .from('messages')
                            .select('created_at')
                            .eq('event_id', gameId)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (latestMsg && (!myBooking.last_read_at || new Date(latestMsg.created_at) > new Date(myBooking.last_read_at))) {
                            setHasUnreadChat(true);
                        }
                    }

                    // Check Admin role
                    const { data: roleData } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .in('role', ['admin', 'master_admin'])
                        .maybeSingle();

                    const isUserHost = gameData.host_ids?.includes(user.id) || !!roleData;
                    if (isUserHost) {
                        setIsParticipant(true);
                        setIsHost(true);
                    }

                    // For the Free Agent Draft Feature: Any user with a confirmed/paid booking who also has a `team_assignment`
                    // can technically act as a generic "Captain" if they want to recruit players into their own squad.
                    // (Assuming we want *anyone* on a team to be able to recruit)
                    
                    if (gameData.is_league && myBooking && myBooking.team_assignment) {
                        // For Phase 43: True captains are those who vaulted their card
                        if (myBooking.stripe_payment_method_id) {
                            setIsCaptain(true);
                            setCustomInviteFee(myBooking.custom_invite_fee ?? '');
                        }
                    }
                }
            }
            setLoading(false);
        };

        fetchGameData();
    }, [gameId, supabase]);

    const proceedToJoin = async (data: { note: string; paymentMethod: 'venmo' | 'zelle' | 'cash' | null; promoCodeId?: string; teamAssignment?: string; isFreeAgent?: boolean; prizeSplitPreference?: string }) => {
        if (!game) return;
        setJoinLoading(true);

        try {
            const currentPlayersCount = bookings.filter(b => ['active', 'paid', 'free_agent_pending'].includes(b.status) && b.roster_status !== 'dropped').length;
            const isWaitlist = currentPlayersCount >= game.max_players;

            if (game.price === 0 || isWaitlist || data.paymentMethod) {
                const endpoint = (isWaitlist && !data.paymentMethod) ? '/api/waitlist' : '/api/join';

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameId: game.id,
                        note: data.note,
                        paymentMethod: game.price === 0 && !data.paymentMethod ? 'promo' : data.paymentMethod,
                        promoCodeId: data.promoCodeId,
                        teamAssignment: data.teamAssignment
                    })
                });

                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.error || responseData.message);
                
                alert("Successfully joined!");
                setIsJoinModalOpen(false);
                setJoinLoading(false);
                window.location.reload();
                return;
            }

            if (userProfile?.free_game_credits > 0) {
                const useCredit = confirm(`You have ${userProfile.free_game_credits} Free Game Credit(s). Would you like to use one for this game?`);
                if (useCredit) {
                    const response = await fetch('/api/join-with-credit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gameId: game.id, note: data.note, teamAssignment: data.teamAssignment })
                    });

                    if (!response.ok) throw new Error((await response.json()).error);
                    alert("Success! Free credit redeemed.");
                    setIsJoinModalOpen(false);
                    setJoinLoading(false);
                    window.location.reload();
                    return;
                }
            }

            const checkoutRes = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: game.id,
                    userId: currentUser!.id,
                    price: game.price,
                    title: `Join Match: ${game.title || 'Pickup Game'}`,
                    note: data.note,
                    promoCodeId: data.promoCodeId,
                    teamAssignment: data.teamAssignment,
                    isFreeAgent: data.isFreeAgent
                })
            });

            const responseData = await checkoutRes.json();
            if (!checkoutRes.ok) throw new Error(responseData.error);
            window.location.href = responseData.url;

        } catch (error: any) {
            console.error('Join Error:', error);
            alert('Failed to join: ' + error.message);
            setJoinLoading(false);
        }
    };

    const handleSaveInviteFee = async () => {
        if (!userBooking || typeof customInviteFee !== 'number' || customInviteFee < 0) return;
        setIsSavingFee(true);
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ custom_invite_fee: customInviteFee })
                .eq('id', userBooking.id);
            if (error) throw error;
            alert("Invite fee updated!");
        } catch (err: any) {
            console.error(err);
            alert("Error saving fee.");
        } finally {
            setIsSavingFee(false);
        }
    };

    const copyInviteLink = () => {
        if (!userBooking?.team_assignment || !game) return;
        const link = `${origin}/invite/${game.id}?team=${encodeURIComponent(userBooking.team_assignment)}`;
        navigator.clipboard.writeText(link);
        alert("Invite Link Copied!");
    };

    const isRosterLocked = game?.roster_lock_date ? new Date() > new Date(game.roster_lock_date) : false;

    if (loading) return <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white"><Loader2 className="animate-spin w-8 h-8" /></div>;
    if (!game) return <div className="min-h-screen bg-pitch-black pt-32 text-center text-white">Game not found.</div>;

    const gameDate = new Date(game.start_time);
    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Filter active roster for sorting/display
    // Fallback to legacy status ('paid', 'active', 'waitlist') if roster_status is null
    const validBookings = bookings.filter(b => b.roster_status !== 'dropped' && b.status !== 'cancelled');

    // Active Roster
    const activeRoster = validBookings.filter(b =>
        (b.roster_status === 'confirmed') ||
        (!b.roster_status && ['paid', 'active'].includes(b.status))
    );

    // Waitlist (First in, First out)
    const waitlist = validBookings.filter(b =>
        (b.roster_status === 'waitlisted') ||
        (!b.roster_status && b.status === 'waitlist')
    ).sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    // Free Agent Pool
    const freeAgents = bookings.filter(b => b.status === 'free_agent_pending');

    // Compute My Team Data
    const assignedTeamConfig = game.teams_config && userBooking?.team_assignment
        ? game.teams_config.find((t: any) => t.name === userBooking.team_assignment)
        : null;
    const assignedTeamName = assignedTeamConfig?.name || `Team ${userBooking?.team_assignment}`;

    const teammates = userBooking?.team_assignment
        ? validBookings.filter(b => b.team_assignment === userBooking.team_assignment)
        : [];

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pb-20">
            {/* Header Image / Gradient */}
            <div className="h-64 md:h-80 bg-gradient-to-b from-pitch-accent/20 to-pitch-black relative">
                <div className="absolute inset-0 bg-[url('/pattern.png')] opacity-10"></div>

                <div className="max-w-4xl mx-auto px-6 h-full flex flex-col justify-end pb-8">
                    <Link href="/schedule" className="flex items-center text-white/70 hover:text-white mb-4 transition-colors w-fit">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Schedule
                    </Link>
                    <h1 className="font-heading text-3xl md:text-5xl font-bold italic uppercase tracking-tighter mb-2">
                        {game.title}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm md:text-base text-gray-300 font-medium">
                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-pitch-accent" /> {dateStr}</div>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-pitch-accent" /> {timeStr}</div>
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(game.location)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                            <MapPin className="w-4 h-4 text-pitch-accent shrink-0" />
                            {game.location_name || game.location}
                        </a>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 mt-8">
                {/* Tabs */}
                <div className="flex items-center border-b border-white/10 mb-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={cn(
                            "px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 shrink-0",
                            activeTab === 'details' ? "border-pitch-accent text-white" : "border-transparent text-gray-500 hover:text-white"
                        )}
                    >
                        <Info className="w-4 h-4" /> Details
                    </button>
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={cn(
                            "px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 shrink-0",
                            activeTab === 'roster' ? "border-pitch-accent text-white" : "border-transparent text-gray-500 hover:text-white"
                        )}
                    >
                        <Users className="w-4 h-4" /> Roster <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded ml-1">{activeRoster.length}</span>
                    </button>
                    <button
                        onClick={async () => {
                            setActiveTab('chat');
                            if (hasUnreadChat && userBooking) {
                                setHasUnreadChat(false);
                                await supabase
                                    .from('bookings')
                                    .update({ last_read_at: new Date().toISOString() })
                                    .eq('id', userBooking.id);
                            }
                        }}
                        className={cn(
                            "px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 shrink-0",
                            activeTab === 'chat' ? "border-pitch-accent text-white" : "border-transparent text-gray-500 hover:text-white"
                        )}
                    >
                        <MessageSquare className="w-4 h-4" /> Chat
                        {hasUnreadChat && <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)]" title="New unread messages" />}
                    </button>
                    {game.event_type === 'tournament' && (
                        <button
                            onClick={() => setActiveTab('tournament-hub')}
                            className={cn(
                                "px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 shrink-0",
                                activeTab === 'tournament-hub' ? "border-pitch-accent text-white" : "border-transparent text-gray-500 hover:text-white"
                            )}
                        >
                            <Trophy className="w-4 h-4" /> Tournament Hub
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* DETAILS TAB */}
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-6">
                                {/* MARKETING BLOCK For Tournaments & Leagues */}
                                {(game.event_type === 'tournament' || game.event_type === 'league') && (
                                    <section className="bg-gradient-to-br from-pitch-accent/10 to-transparent border border-pitch-accent/30 p-8 rounded-sm text-center shadow-[0_0_30px_rgba(204,255,0,0.05)]">
                                        <h2 className="font-heading text-3xl font-black italic uppercase text-pitch-accent mb-4">Event Details & Rules</h2>
                                        {game.description ? (
                                            <p className="text-gray-300 whitespace-pre-wrap text-left bg-black/40 p-6 rounded border border-white/5 mb-6 leading-relaxed">
                                                {game.description}
                                            </p>
                                        ) : (
                                            <p className="text-gray-500 italic mb-6">No specific rules provided.</p>
                                        )}
                                        
                                        {game.prize_type && game.prize_type !== 'none' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                {game.prize_type === 'physical' && game.reward && (
                                                    <div className="bg-white/5 border border-white/10 p-4 rounded flex items-center gap-4">
                                                        <Award className="w-8 h-8 text-yellow-500 shrink-0" />
                                                        <div className="text-left">
                                                            <p className="text-xs font-bold uppercase text-gray-400">Grand Prize</p>
                                                            <p className="font-black text-lg text-white uppercase break-words">{game.reward}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {game.prize_type === 'fixed' && game.fixed_prize_amount && (
                                                    <div className="bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/30 p-4 rounded flex items-center gap-4">
                                                        <DollarSign className="w-8 h-8 text-green-500 shrink-0" />
                                                        <div className="text-left">
                                                            <p className="text-xs font-bold uppercase text-green-500/70">Fixed Cash Prize</p>
                                                            <p className="font-black text-2xl text-green-400">
                                                                ${game.fixed_prize_amount.toString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {game.prize_type === 'pool' && game.prize_pool_percentage && (
                                                    <div className="bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/30 p-4 rounded flex items-center gap-4">
                                                        <DollarSign className="w-8 h-8 text-green-500 shrink-0" />
                                                        <div className="text-left">
                                                            <p className="text-xs font-bold uppercase text-green-500/70">Live Prize Pot ({game.prize_pool_percentage}%)</p>
                                                            <p className="font-black text-2xl text-green-400">
                                                                ${(activeRoster.length * game.price * (game.prize_pool_percentage / 100)).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Capacity & Actions */}
                                        <div className="border-t border-pitch-accent/20 pt-6">
                                            <div className="mb-6 text-left">
                                                <div className="flex justify-between items-end mb-1">
                                                    <p className="text-sm font-bold uppercase tracking-wider text-pitch-secondary">Squad Capacity</p>
                                                    <p className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded border border-white/10">
                                                        {activeRoster.length} / {game.max_players} Confirmed
                                                    </p>
                                                </div>
                                                <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-white/10">
                                                    <div 
                                                        className="h-full bg-pitch-accent transition-all duration-1000"
                                                        style={{ width: `${Math.min(100, (activeRoster.length / game.max_players) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {!isParticipant && !isHost && (
                                                <button 
                                                    onClick={() => {
                                                        if (!currentUser) {
                                                            router.push('/login');
                                                        } else {
                                                            setIsJoinModalOpen(true);
                                                        }
                                                    }}
                                                    className="w-full py-4 bg-pitch-accent text-pitch-black font-black text-lg uppercase tracking-wider hover:bg-white transition-colors rounded-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.3)]"
                                                >
                                                    {activeRoster.length >= game.max_players ? "Join Waitlist &rarr;" : "Register for Event &rarr;"}
                                                </button>
                                            )}
                                            {isParticipant && !isHost && (
                                                <div className="bg-green-500/10 text-green-500 font-bold uppercase text-sm py-3 rounded border border-green-500/20">
                                                    You are registered for this event
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )}

                                <section className="bg-pitch-card border border-white/10 p-6 rounded-sm">
                                    <h3 className="font-heading text-xl font-bold italic uppercase mb-4 text-pitch-accent">Game Info</h3>
                                    <div className="space-y-4 text-gray-300">
                                        <p><strong>Surface:</strong> {game.surface_type}</p>
                                        <p><strong>Format:</strong> {game.game_format || 'Pickup Match'}</p>
                                        <p><strong>Price:</strong> ${game.price}</p>
                                        {game.description && <p className="mt-4 pt-4 border-t border-white/10">{game.description}</p>}
                                    </div>
                                </section>

                                {/* Team Assignment (if joined and assigned) */}
                                {userBooking?.team_assignment && (
                                    <section className="bg-gradient-to-r from-pitch-card to-white/5 border border-white/10 p-6 rounded-sm">
                                        <h3 className="font-heading text-lg font-bold italic uppercase mb-4 flex items-center gap-2 text-pitch-accent border-b border-white/10 pb-2">
                                            <Shirt className="w-5 h-5" /> Active Squad
                                        </h3>
                                        <div className="mb-4">
                                            <p className="text-3xl font-black text-white uppercase italic tracking-wider">{assignedTeamName}</p>
                                        </div>

                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {teammates.length > 0 ? (
                                                teammates.map(mate => {
                                                    const isMe = mate.user_id === currentUser?.id;
                                                    const fullName = mate.profiles?.full_name || mate.profiles?.email || 'Player';

                                                    return (
                                                        <div key={mate.id} className={cn("text-sm font-medium flex items-center gap-2 p-2 rounded", isMe ? "bg-pitch-accent/10 border border-pitch-accent/20" : "bg-black/30 border border-white/5")}>
                                                            <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-400 font-bold shrink-0">
                                                                {fullName.charAt(0)}
                                                            </div>
                                                            <span className={cn("truncate", isMe ? "text-pitch-accent" : "text-gray-300")}>
                                                                {fullName} {isMe && "(You)"}
                                                            </span>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div className="text-sm text-gray-500 italic">No teammates yet.</div>
                                            )}
                                        </div>
                                    </section>
                                )}
                            </div>

                            {/* Side Panel (Map placeholder or rules) */}
                            <div className="md:col-span-1 space-y-6">

                                {/* Captain's Dashboard */}
                                {isCaptain && userBooking && (
                                    <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/30 p-6 rounded-sm mb-6 animate-in fade-in">
                                        <h4 className="font-bold uppercase text-sm mb-4 text-blue-400 flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-blue-500" /> Captain's Panel
                                        </h4>
                                        <p className="text-xs text-gray-300 mb-4 leading-relaxed">
                                            Set the <strong className="text-white">Player Invite Fee</strong> that teammates will pay to join your roster. Payments lower your remaining team balance.
                                        </p>

                                        <div className="mb-4">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2 flex items-center gap-1">
                                                <DollarSign className="w-3 h-3 text-green-400" /> Player Invite Fee
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="0" step="0.01"
                                                    value={customInviteFee}
                                                    onChange={(e) => setCustomInviteFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                    placeholder="e.g. 85.00"
                                                    className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                                                />
                                                <button
                                                    onClick={handleSaveInviteFee}
                                                    disabled={isSavingFee}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-xs px-4 rounded-sm transition-colors disabled:opacity-50 tracking-wider"
                                                >
                                                    {isSavingFee ? 'Saving...' : 'Set Fee'}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            onClick={copyInviteLink}
                                            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2 text-xs hover:border-white/30"
                                        >
                                            <Share2 className="w-4 h-4" /> Copy Invite Link
                                        </button>
                                    </div>
                                )}

                                <div className="bg-white/5 p-6 rounded-sm border border-white/10">
                                    <h4 className="font-bold uppercase text-sm mb-4 text-gray-400">Location</h4>
                                    {game.latitude && game.longitude ? (
                                        <GameMap
                                            latitude={game.latitude}
                                            longitude={game.longitude}
                                            locationName={game.location_name || game.location}
                                        />
                                    ) : (
                                        <div className="aspect-video bg-gray-800 rounded mb-4 flex items-center justify-center text-gray-600 text-xs">
                                            Map Unavailable
                                        </div>
                                    )}
                                    {!game.latitude && (
                                        <a href={`https://maps.google.com/?q=${encodeURIComponent(game.location)}`} target="_blank" rel="noreferrer" className="font-bold text-sm mt-4 hover:text-pitch-accent transition-colors block">
                                            {game.location_name || game.location}
                                        </a>
                                    )}
                                </div>

                                {/* MVP Voting Section */}
                                {false && isParticipant && ['active', 'paid'].includes(userBooking?.status || '') && isVotingOpen && (
                                    <div className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 p-6 rounded-sm">
                                        <h4 className="font-bold uppercase text-sm mb-2 text-yellow-500 flex items-center gap-2">
                                            <Trophy className="w-4 h-4" /> MVP Vote
                                        </h4>

                                        {hasVoted ? (
                                            <div className="text-center py-4">
                                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 text-green-500 mb-2">
                                                    <Check className="w-6 h-6" />
                                                </div>
                                                <p className="text-white font-bold text-sm">Vote Submitted!</p>
                                                <p className="text-xs text-gray-400 mt-1">Waiting for results...</p>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-xs text-gray-400 mb-4">
                                                    Voting is open! Select the player who made the biggest impact.
                                                </p>
                                                <button
                                                    onClick={() => setVoteModalOpen(true)}
                                                    className="w-full py-3 bg-yellow-500 text-black font-black uppercase tracking-wider rounded-sm hover:bg-yellow-400 transition-colors text-xs"
                                                >
                                                    Vote Now
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Leave Game Option */}
                                {isParticipant && userBooking && (
                                    <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-sm">
                                        <h4 className="font-bold uppercase text-sm mb-2 text-red-500">Manage Booking</h4>
                                        <p className="text-xs text-gray-400 mb-4">
                                            {userBooking.status === 'waitlist'
                                                ? "You are currently on the waitlist. You can leave at any time."
                                                : "Can't make it? Please leave the game to open up a spot for others."}
                                        </p>
                                        <button
                                            onClick={() => setLeaveModalOpen(true)}
                                            className="w-full text-center px-4 py-3 border-2 border-red-500 text-red-500 text-xs font-bold uppercase hover:bg-red-500 hover:text-white transition-colors rounded-sm shadow-md"
                                        >
                                            {userBooking.status === 'waitlist' ? 'Leave Waitlist' : 'Leave Game'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ROSTER TAB */}
                    {activeTab === 'roster' && (
                        <div className="space-y-8">
                            <div className="bg-pitch-card border border-white/10 rounded-sm overflow-hidden">
                                <div className="p-4 bg-white/5 border-b border-white/10 font-bold uppercase text-sm text-pitch-secondary">
                                    Active Squad ({activeRoster.length}/{game.max_players})
                                </div>
                                <div className="divide-y divide-white/5">
                                    {activeRoster.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500 italic">No players joined yet. Be the first!</div>
                                    ) : (
                                        activeRoster.map((player) => {
                                            const name = player.profiles?.full_name || player.profiles?.email || 'Unknown';
                                            const isMe = currentUser?.id === player.user_id;

                                            return (
                                                <div key={player.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 font-bold">
                                                            {name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className={cn("font-bold", isMe ? "text-pitch-accent" : "text-white")}>
                                                                {name} {isMe && "(You)"}
                                                            </div>
                                                            {player.team_assignment && (
                                                                <div className="text-xs text-gray-400 uppercase font-bold mt-0.5 max-w-[120px] truncate">
                                                                    Squad: {player.team_assignment}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {player.status === 'paid' && (
                                                        <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded font-bold uppercase">Confirmed</span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Roster Lock Warning */}
                            {isRosterLocked && game.event_type === 'tournament' && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-6 text-center mb-8 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                    <h3 className="text-red-500 font-bold uppercase tracking-wider text-lg">Rosters Locked</h3>
                                    <p className="text-red-400/80 text-sm mt-1">The deadline to draft Free Agents or alter squads has passed.</p>
                                </div>
                            )}

                            {/* Free Agent Pool */}
                            {!isRosterLocked && freeAgents.length > 0 && (
                                <div className="bg-gradient-to-br from-pitch-card to-pitch-black border border-pitch-accent/30 rounded-sm overflow-hidden mb-8 shadow-[0_0_20px_rgba(204,255,0,0.05)]">
                                    <div className="p-4 bg-pitch-accent/10 border-b border-pitch-accent/20 font-bold uppercase text-sm text-pitch-accent flex items-center gap-2">
                                        <Crown className="w-5 h-5" /> Free Agent Pool ({freeAgents.length})
                                    </div>
                                    <div className="p-6">
                                        <p className="text-sm text-gray-400 mb-6 italic">
                                            These players have authorized a payment hold and are waiting to be drafted to a squad.
                                        </p>
                                        <div className="flex overflow-x-auto gap-6 pb-8 snap-x p-2 custom-scrollbar">
                                            {freeAgents.map((fa) => {
                                                // Create a slimmed mock player object based on Profile fields available.
                                                // In a real scenario we might fetch their OVR, matches_played, etc. 
                                                // We'll use defaults for the aesthetic.
                                                const faProfile = Array.isArray(fa.profiles) ? fa.profiles[0] : fa.profiles;
                                                const mockPlayer = {
                                                    id: fa.user_id,
                                                    full_name: faProfile?.full_name || 'Free Agent',
                                                    position: 'UTL',
                                                    ovr: 75,
                                                    matches_played: 0,
                                                    wins: 0,
                                                };

                                                return (
                                                    <div key={fa.id} className="snap-center shrink-0 w-[240px]">
                                                        <FreeAgentCard
                                                            player={mockPlayer}
                                                            bookingId={fa.id}
                                                            gameId={game.id}
                                                            teamsConfig={game.teams_config}
                                                            isCaptain={isParticipant && !!userBooking?.team_assignment}
                                                            onDraft={async (bookingId, teamAssignment) => {
                                                                const result = await draftFreeAgent(bookingId, teamAssignment);
                                                                if (!result.success) throw new Error(result.error);

                                                                // Optimistic update
                                                                setBookings(prev => prev.map(b =>
                                                                    b.id === bookingId ? { ...b, status: 'paid', team_assignment: teamAssignment } : b
                                                                ));
                                                            }}
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Waitlist */}
                            {waitlist.length > 0 && (
                                <div className="bg-pitch-card border border-white/10 rounded-sm overflow-hidden opacity-75">
                                    <div className="p-4 bg-white/5 border-b border-white/10 font-bold uppercase text-sm text-yellow-500 flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Waitlist ({waitlist.length})
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {waitlist.map((player) => {
                                            const name = player.profiles?.full_name || player.profiles?.email || 'Unknown';
                                            return (
                                                <div key={player.id} className="p-4 flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-500 text-xs">
                                                        WL
                                                    </div>
                                                    <div className="text-gray-400 text-sm font-medium">{name}</div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CHAT TAB */}
                    {activeTab === 'chat' && (
                        <div>
                            {!currentUser ? (
                                <div className="text-center py-20 bg-pitch-card border border-white/10 rounded-sm">
                                    <h3 className="text-xl font-bold mb-2">Join the conversation</h3>
                                    <p className="text-gray-400 mb-6">You must be logged in to view the chat.</p>
                                    <Link href="/login" className="bg-pitch-accent text-pitch-black px-6 py-2 rounded-sm font-bold uppercase">Log In</Link>
                                </div>
                            ) : (
                                <div className="md:col-span-2">
                                    <ChatInterface
                                        gameId={gameId}
                                        currentUserId={currentUser.id}
                                        isParticipant={isParticipant}
                                        isHost={isHost}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* TOURNAMENT HUB TAB */}
                    {activeTab === 'tournament-hub' && game.event_type === 'tournament' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <h2 className="font-heading text-2xl font-bold italic uppercase flex items-center gap-2 text-pitch-accent border-b border-white/10 pb-4">
                                <Trophy className="w-6 h-6" /> Live Standings
                            </h2>

                            {matches.length > 0 ? (
                                <>
                                    <StandingsTable
                                        gameId={game.id}
                                        teams={game.teams_config || []}
                                        matches={matches}
                                    />

                                    <h2 className="font-heading text-xl font-bold italic uppercase border-b border-white/10 pb-4 mt-12 mb-6 text-pitch-secondary">
                                        Match Schedule
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {matches.map(m => (
                                            <div key={m.id} className="bg-pitch-card border border-white/5 rounded p-4 flex flex-col justify-between">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-xs font-bold uppercase text-gray-400">Round {m.round_number} • {m.tournament_stage}</span>
                                                    <span className={cn("text-[10px] uppercase font-black px-2 py-0.5 rounded",
                                                        m.status === 'completed' ? "bg-pitch-accent/20 text-pitch-accent" :
                                                            m.status === 'active' ? "bg-green-500/20 text-green-500 animate-pulse" :
                                                                "bg-white/10 text-gray-300"
                                                    )}>
                                                        {m.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-lg font-black">
                                                    <span className="truncate max-w-[40%]">{m.home_team}</span>
                                                    <div className="bg-black/40 px-3 py-1 rounded text-pitch-accent border border-pitch-accent/20">
                                                        {m.status === 'scheduled' ? 'VS' : `${m.home_score} - ${m.away_score}`}
                                                    </div>
                                                    <span className="truncate max-w-[40%] text-right">{m.away_team}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white/5 border border-white/10 p-8 rounded-sm text-center">
                                    <Crown className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-gray-300 mb-2">Schedule Not Generated</h3>
                                    <p className="text-gray-500">The tournament schedule will be available closer to the event launch.</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {voteModalOpen && (
                <VotingModal
                    gameId={gameId}
                    candidates={bookings
                        .filter(b => ['active', 'paid'].includes(b.status) && b.user_id !== currentUser?.id)
                        .map(b => {
                            const p = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
                            return {
                                id: p?.id || b.user_id,
                                full_name: p?.full_name || 'Unknown',
                                email: p?.email || '',
                                team_assignment: b.team_assignment?.toString()
                            };
                        })
                    }
                    onVoteSuccess={() => setHasVoted(true)}
                    onClose={() => setVoteModalOpen(false)}
                />
            )}

            <ConfirmationModal
                isOpen={leaveModalOpen}
                onClose={() => setLeaveModalOpen(false)}
                onConfirm={async () => {
                    if (!userBooking) return;
                    setLoading(true);
                    try {
                        const result = await cancelPlayerRegistration(userBooking.id);

                        if (!result.success) {
                            throw new Error(result.error);
                        }

                        alert(result.message || 'You have left the game.');
                        router.push('/dashboard');
                        setLeaveModalOpen(false);
                    } catch (err: any) {
                        console.error(err);
                        alert(err.message || 'Failed to cancel registration.');
                    } finally {
                        setLoading(false);
                    }
                }}
                title={userBooking?.status === 'waitlist' ? "Leave Waitlist?" : "Leave this game?"}
                message={
                    userBooking?.status === 'waitlist'
                        ? "Are you sure you want to leave the waitlist?"
                        : (() => {
                            const hours = (new Date(game.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60);
                            return hours > 6
                                ? (
                                    <span className="text-green-400 font-medium">
                                        You will be removed from the roster and your credit will be refunded.
                                    </span>
                                )
                                : (
                                    <span className="text-red-500 font-bold block bg-red-500/10 p-4 rounded border border-red-500/20">
                                        ⚠️ Warning: This game starts in less than 6 hours. You will NOT receive a refund.
                                    </span>
                                );
                        })()
                }
                confirmText="Confirm Leave"
                cancelText="Keep Playing"
                isDestructive={true}
            />

            {/* Join Modal */}
            <JoinGameModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
                onConfirm={proceedToJoin}
                gamePrice={game.price}
                loading={joinLoading}
                isWaitlist={activeRoster.length >= game.max_players}
                gameId={game.id}
            />
        </div>
    );
}

// Helper Loader
function Loader2({ className }: { className?: string }) {
    return (
        <svg
            className={cn("animate-spin", className)}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            ></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    )
}

function Check({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}> <polyline points="20 6 9 17 4 12" /> </svg>
    )
}
