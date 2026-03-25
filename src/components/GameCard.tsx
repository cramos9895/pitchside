
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, Check, UserPlus, X, Clock, Zap, Trophy, Users, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { JoinGameModal } from './JoinGameModal';

interface Game {
    id: string;
    title: string;
    location_name?: string;
    location: string;
    location_nickname?: string | null;
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
    match_style?: string;
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

    const proceedToJoin = async (data: { note: string; paymentMethod: 'venmo' | 'zelle' | 'cash' | 'platform_paid' | null; promoCodeId?: string; teamAssignment?: string; isFreeAgent?: boolean; prizeSplitPreference?: string; isLeagueCaptainVaulting?: boolean }) => {
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
    const isCompleted = game.status === 'completed';
    const isLive = !isPastStrict && !isCancelled;

    return (
        <>
            <div className="bg-pitch-card border border-white/5 rounded-sm p-6 shadow-2xl hover:border-pitch-accent/20 transition-all group overflow-hidden relative flex flex-col h-full">
                {/* Glossy Overlay Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                {/* Status Indicator Bar */}
                <div className={cn(
                    "absolute top-0 left-0 w-1 h-full transition-colors",
                    isCancelled ? "bg-red-500" : isCompleted ? "bg-green-500" : isLive ? "bg-pitch-accent" : "bg-gray-600"
                )} />

                <div className="relative z-10 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1 mr-4">
                            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-[0.85] mb-4 font-sans break-words overflow-hidden">
                                {game.title || `${game.game_format || '7v7'} Pickup`}
                            </h2>
                            <div className="flex flex-col gap-1 text-pitch-secondary text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-pitch-accent" />
                                    {dateStr} @ {startTimeStr}
                                </div>
                                <div className="flex items-center gap-2 truncate">
                                    <MapPin className="w-3 h-3 text-pitch-accent shrink-0" />
                                    <span className="truncate">{game.location_nickname || game.location_name || game.location?.split(',')[0]}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                            {hasUnreadMessages && (
                                <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] relative" title="New messages in Chat">
                                    <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75"></div>
                                </div>
                            )}
                            <div className={cn(
                                "px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest border",
                                isCancelled ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                isCompleted ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                "bg-pitch-accent/10 text-pitch-accent border-pitch-accent/20"
                            )}>
                                {isCancelled ? 'Cancelled' : isCompleted ? 'Completed' : 'Upcoming'}
                            </div>
                        </div>
                    </div>

                    {/* Details Matrix */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="bg-white/5 p-4 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                            <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                                <Users className="w-3 h-3" /> Players
                            </div>
                            <div className="text-white font-black text-xs uppercase">{currentPlayers} / {game.max_players}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                            <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors">Format</div>
                            <div className="text-white font-bold text-xs uppercase">{game.match_style || game.game_format || 'Match'}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                            <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> Fee
                            </div>
                            <div className="text-pitch-accent font-black text-xs uppercase">
                                {joined ? (status === 'waitlist' ? 'Waitlist' : 'Paid') : `$${game.price}`}
                            </div>
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                        {isCancelled ? (
                            <div className="col-span-1 sm:col-span-2 py-4 bg-white/5 border border-white/10 text-gray-500 font-black uppercase text-center text-xs tracking-widest rounded-sm">
                                Event Cancelled
                            </div>
                        ) : joined ? (
                            <button
                                onClick={() => router.push(`/games/${game.id}?tab=chat`)}
                                className="col-span-1 sm:col-span-2 w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.15)] rounded-sm group/btn"
                            >
                                Match Lobby <Check className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => router.push(`/games/${game.id}`)}
                                    className="w-full py-4 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all rounded-sm"
                                >
                                    Details
                                </button>
                                <button
                                    onClick={handleJoinClick}
                                    disabled={loading}
                                    className={cn(
                                        "w-full py-4 font-black uppercase tracking-widest text-xs transition-all transform active:scale-95 flex items-center justify-center gap-2 rounded-sm shadow-xl",
                                        currentPlayers >= game.max_players
                                            ? "bg-yellow-500 text-black hover:bg-white shadow-yellow-500/10"
                                            : "bg-pitch-accent text-pitch-black hover:bg-white shadow-pitch-accent/10"
                                    )}
                                >
                                    {loading ? '...' : currentPlayers >= game.max_players ? 'Waitlist' : 'Join Now'} <UserPlus className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

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
