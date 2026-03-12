
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, Check, UserPlus, X, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { JoinGameModal } from './JoinGameModal';

interface Game {
    id: string;
    title: string;
    location_name?: string;
    location: string;
    game_format?: string;
    start_time: string;
    end_time: string | null;
    price: number;
    max_players: number;
    current_players: number;
    surface_type: string;
    facility_id?: string | null;
    resource_id?: string | null;
    status: string; // 'scheduled', 'active', 'completed', 'cancelled'
    has_mvp_reward?: boolean;
    event_type?: string;
    is_league?: boolean;
}

interface GameCardProps {
    game: Game;
    user: User | null;
    bookingStatus?: string; // 'paid', 'waitlist', 'active'
    hasUnreadMessages?: boolean;
}

export function GameCard({ game, user, bookingStatus, hasUnreadMessages }: GameCardProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(!!bookingStatus);
    const [status, setStatus] = useState<string | undefined>(bookingStatus);
    const [currentPlayers, setCurrentPlayers] = useState(game.current_players);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const supabase = createClient();

    const gameDate = new Date(game.start_time);

    let endDate: Date;
    if (game.end_time) {
        if (game.end_time.includes('T') || game.end_time.includes('-')) {
            endDate = new Date(game.end_time);
        } else {
            // Handle Time String "HH:mm:ss"
            const [h, m] = game.end_time.split(':').map(Number);
            endDate = new Date(gameDate);
            endDate.setHours(h);
            endDate.setMinutes(m);
            if (endDate < gameDate) endDate.setDate(endDate.getDate() + 1);
        }
    } else {
        endDate = new Date(gameDate.getTime() + 90 * 60000);
    }

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel(`game-${game.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'games',
                    filter: `id=eq.${game.id}`
                },
                (payload) => {
                    const newGame = payload.new as Game;
                    if (newGame.current_players !== undefined) {
                        setCurrentPlayers(newGame.current_players);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [game.id, supabase]);

    // Duration
    // Duration (Fix: Explicit HH:MM math)
    const startHour = gameDate.getHours();
    const startMin = gameDate.getMinutes();
    const endHour = endDate.getHours();
    const endMin = endDate.getMinutes();

    let diffMins = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (diffMins < 0) diffMins += 24 * 60; // Handle next day

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const durationStr = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const startTimeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const endTimeStr = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const isPast = new Date() > new Date(game.end_time || game.start_time); // Use end time for 'completed' check? Dashboard uses start_time. I'll use end_time to be accurate, or start_time to match Dashboard? Dashboard used start_time: `const isPast = new Date() > gameDate;`. I'll Stick to Dashboard logic: start_time.
    // Actually, Dashboard used `gameDate` which is start_time.
    // "Completed" if start time passed is aggressive, but matches Dashboard.
    const isPastStrict = new Date() > gameDate;

    const handleJoinClick = () => {
        if (!user) {
            router.push('/login');
            return;
        }
        if (joined) return;

        // Open Modal instead of immediate join
        setIsModalOpen(true);
    };

    const handleLeave = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: game.id })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setJoined(false);
            setStatus(undefined);
            if (currentPlayers > 0 && status !== 'waitlist') {
                // Only decrement if we weren't on waitlist... 
                // Optimistic update:
                setCurrentPlayers(prev => Math.max(0, prev - 1));
            }
            alert(status === 'waitlist' ? 'You have left the waitlist.' : 'You have left the game.');
            router.refresh();
        } catch (error: any) {
            console.error('Leave Error:', error);
            alert('Failed to leave: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        if (user) {
            supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
                setUserProfile(data);
            });
        }
    }, [user, supabase]);

    const proceedToJoin = async (data: { note: string; paymentMethod: 'venmo' | 'zelle' | 'cash' | null; promoCodeId?: string; teamAssignment?: string; isFreeAgent?: boolean; prizeSplitPreference?: string; isLeagueCaptainVaulting?: boolean }) => {
        setLoading(true);

        try {
            // Fetch latest price in case it changed
            const { data: latestGame } = await supabase
                .from('games')
                .select('price')
                .eq('id', game.id)
                .single();

            const currentPrice = latestGame?.price || game.price;

            // Placeholder for discountAmount, assuming it would be calculated or passed
            // For this specific change, we'll assume discountAmount is 0 if not provided
            const discountAmount = 0; // This would typically come from promo code validation

            let finalCost = currentPrice;
            if (discountAmount > 0) {
                finalCost = Math.max(0, currentPrice - discountAmount);
            }

            // Check for Free Game OR Waitlist OR Manual Payment OR 100% Promo Code
            const isFull = game.max_players != null && currentPlayers >= game.max_players;
            if (finalCost === 0 || isFull || data.paymentMethod) {
                const endpoint = (isFull && !data.paymentMethod) ? '/api/waitlist' : '/api/join';

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameId: game.id,
                        note: data.note,
                        paymentMethod: finalCost === 0 && !data.paymentMethod ? 'promo' : data.paymentMethod,
                        promoCodeId: data.promoCodeId,
                        teamAssignment: data.teamAssignment,
                        prizeSplitPreference: data.prizeSplitPreference
                    })
                });

                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.error || responseData.message);
                if (responseData.message) {
                    alert(responseData.message); // "Already joined" etc
                    if (responseData.success === false) {
                        setLoading(false);
                        setIsModalOpen(false);
                        return;
                    }
                }

                setJoined(true);
                const wasAlreadyFull = game.max_players != null && currentPlayers >= game.max_players;
                if (!wasAlreadyFull) {
                    setStatus('paid');
                    // Optimistic update:
                    setCurrentPlayers(prev => prev + 1);
                } else {
                    setStatus('waitlist');
                    alert("You've been added to the waitlist!");
                }

                setIsModalOpen(false);
                setLoading(false);
                return;
            }

            // Check for Credits (Redemption)
            if (userProfile?.free_game_credits > 0) {
                const useCredit = confirm(`You have ${userProfile.free_game_credits} Free Game Credit(s). Would you like to use one for this game?`);

                if (useCredit) {
                    const response = await fetch('/api/join-with-credit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            gameId: game.id,
                            note: data.note,
                            teamAssignment: data.teamAssignment,
                            prizeSplitPreference: data.prizeSplitPreference
                        })
                    });

                    const responseData = await response.json();
                    if (!response.ok) throw new Error(responseData.error);

                    setJoined(true);
                    setStatus('paid');
                    setCurrentPlayers(prev => prev + 1); // Optimistic update
                    alert("Success! logic: Free credit redeemed.");
                    // Decrement local credit count optimistically
                    setUserProfile({ ...userProfile, free_game_credits: userProfile.free_game_credits - 1 });

                    setIsModalOpen(false);
                    setLoading(false);
                    return;
                }
            }

            // Paid Game (Active Roster) - Stripe
            const checkoutRes = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: game.id,
                    userId: user!.id, // Assuming 'user' is available from props
                    price: finalCost,
                    title: `Join Match: ${game.title || 'Pickup Game'}`,
                    note: data.note,
                    promoCodeId: data.promoCodeId,
                    teamAssignment: data.teamAssignment,
                    isFreeAgent: data.isFreeAgent,
                    prizeSplitPreference: data.prizeSplitPreference,
                    isLeagueCaptainVaulting: data.isLeagueCaptainVaulting
                })
            });

            const responseData = await checkoutRes.json();
            if (!checkoutRes.ok) throw new Error(responseData.error);

            window.location.href = responseData.url;

        } catch (error: any) {
            console.error('Join Error:', error);
            alert('Failed to join: ' + error.message);
            setLoading(false);
        }
    };

    const isCancelled = game.status === 'cancelled';

    return (
        <>
            <div className={cn(
                "group relative bg-pitch-card p-6 rounded-sm shadow-xl transition-all duration-300 flex flex-col h-full",
                isPastStrict ? "border-l-4 border-gray-600 opacity-60" : "border-l-4 border-pitch-accent hover:shadow-pitch-accent/10",
                isCancelled && "opacity-75 grayscale"
            )}>
                <div className="flex justify-between items-start mb-4">
                    <div
                        onClick={() => router.push(`/games/${game.id}`)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <h3 className="font-heading text-2xl font-bold italic text-white flex items-center gap-2">
                            <span>
                                {startTimeStr}
                                <span className="text-gray-500 text-lg font-normal ml-1">- {endTimeStr}</span>
                            </span>
                            {hasUnreadMessages && (
                                <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)] relative ml-1 mb-2" title="New messages in Chat">
                                    <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75"></div>
                                </div>
                            )}
                        </h3>
                        <p className="text-pitch-secondary text-sm font-bold uppercase">{dateStr}</p>
                        {game.title && <p className="text-pitch-accent text-xs font-bold uppercase mt-1 tracking-wider">{game.title}</p>}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className={cn(
                            "px-2 py-1 rounded text-xs font-bold uppercase",
                            isPastStrict ? 'bg-gray-700 text-gray-400' : 'bg-pitch-accent text-pitch-black'
                        )}>
                            {isPastStrict ? 'Completed' : 'Upcoming'}
                        </div>
                        {isCancelled && (
                            <div className="bg-red-500 px-2 py-1 rounded text-xs font-bold uppercase text-white shadow-lg shadow-red-500/20">
                                CANCELLED
                            </div>
                        )}
                        {!isCancelled && game.has_mvp_reward && (
                            <div className="bg-yellow-500/20 border border-yellow-500/50 px-2 py-1 rounded text-xs font-bold uppercase text-yellow-500 flex items-center gap-1 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                                <span>🏆</span> Prize
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2 mb-6 flex-grow">
                    <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(game.location)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center text-pitch-secondary hover:text-white transition-colors"
                    >
                        <MapPin className="w-4 h-4 mr-2 text-pitch-accent shrink-0" />
                        <span className="text-sm truncate">{game.location_name || game.location}</span>
                    </a>
                    <div className="flex items-center gap-4">
                        <span className="text-xs uppercase bg-white/5 px-2 py-0.5 rounded text-gray-400 font-bold border border-white/5">
                            {game.game_format || 'Match'}
                        </span>
                        <span className="text-xs uppercase bg-white/5 px-2 py-0.5 rounded text-gray-400 font-bold border border-white/5">
                            {game.surface_type}
                        </span>
                        <span className={cn(
                            "text-xs uppercase px-2 py-0.5 rounded font-bold border border-white/5",
                            (game.max_players - currentPlayers) === 0
                                ? "bg-red-500/10 text-red-500"
                                : "bg-white/5 text-gray-400"
                        )}>
                            {currentPlayers} / {game.max_players} Spots
                        </span>
                    </div>
                    <div className="flex items-center text-gray-500 text-xs font-bold uppercase mt-1">
                        <Clock className="w-3 h-3 mr-2 text-pitch-accent" />
                        <span>Run Time: {durationStr}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                    {joined ? (
                        status === 'waitlist' ? (
                            <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase tracking-wider">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                On Waitlist
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-wider">
                                <span className="w-2 h-2 bg-green-400 rounded-full" />
                                Confirmed Ticket
                            </div>
                        )
                    ) : (
                        <div className="text-lg font-bold text-white">${game.price}</div>
                    )}

                    {isCancelled ? (
                        <button disabled className="px-4 py-2 border border-red-500/30 text-red-500 font-bold uppercase text-xs rounded-sm cursor-not-allowed flex items-center gap-2">
                            Event Cancelled
                        </button>
                    ) : joined ? (
                        <button
                            onClick={() => router.push(`/games/${game.id}?tab=chat`)}
                            className="px-3 py-1.5 bg-pitch-accent text-pitch-black font-bold uppercase text-xs rounded-sm hover:bg-white transition-colors text-center"
                        >
                            Game Lobby
                        </button>
                    ) : game.event_type === 'tournament' ? (
                        <button
                            onClick={() => router.push(`/games/${game.id}`)}
                            className="px-4 py-2 text-sm font-bold uppercase transition-colors rounded-sm flex items-center gap-2 text-pitch-accent hover:text-white hover:bg-pitch-accent/10 border border-pitch-accent/30"
                        >
                            View Details &rarr;
                        </button>
                    ) : (
                        <button
                            onClick={handleJoinClick}
                            disabled={loading} // Remove full check
                            className={
                                cn(
                                    "px-4 py-2 text-sm font-bold uppercase transition-colors rounded-sm flex items-center gap-2",
                                    currentPlayers >= game.max_players
                                        ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" // Waitlist Style
                                        : game.price === 0
                                            ? "bg-green-500 hover:bg-green-400 text-black"
                                            : "text-pitch-accent hover:text-white hover:bg-pitch-accent/10"
                                )
                            }
                        >
                            {currentPlayers >= game.max_players ? "Join Waitlist" :
                                game.price === 0 ? "Join for Free" :
                                    <>Join &rarr;</>
                            }
                        </button>
                    )}
                </div>
            </div >

            {/* JOIN MODAL */}
            <JoinGameModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={proceedToJoin}
                gamePrice={game.price}
                loading={loading}
                isWaitlist={game.max_players != null && currentPlayers >= game.max_players}
                gameId={game.id}
                isLeague={game.is_league}
            />
        </>
    );
}
