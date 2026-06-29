'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, DollarSign, Users, UserPlus, Check, ArrowRight, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { JoinGameModal } from '../../JoinGameModal';
import { cancelBooking } from '@/app/actions/cancel-booking';
import { EmbeddedCheckoutModal } from '../../EmbeddedCheckoutModal';
import { useToast } from '@/components/ui/Toast';
import { Booking, Profile, ProfileWithUI } from "@/types/index";



interface Game {
    id: string;
    title: string;
    location_name?: string;
    location: string;
    location_nickname?: string;
    game_format?: string;
    game_format_type?: string;
    start_time: string;
    end_time: string | null;
    price: number;
    max_players: number;
    current_players: number;
    match_style?: string;
    status: string; // 'scheduled', 'active', 'completed', 'cancelled'
    is_refundable?: boolean;
}

interface PickupCardProps {
    game: Game;
    user: User | null;
    bookingStatus?: string; // 'paid', 'waitlist', 'active'
    hasUnreadMessages?: boolean;
    bookingId?: string;
}

export function PickupCard({ game, user, bookingStatus, hasUnreadMessages, bookingId }: PickupCardProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(!!bookingStatus);
    const [status, setStatus] = useState<string | undefined>(bookingStatus);
    const [currentPlayers, setCurrentPlayers] = useState(game.current_players);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

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
                (payload: Record<string, unknown>) => {
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

    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const rawStartStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
    const rawEndStr = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
    const startTimeStr = `${rawStartStr} - ${rawEndStr}`;
    const isPastStrict = new Date() > gameDate;

    const handleJoinClick = () => {
        if (!user) {
            router.push('/login');
            return;
        }
        if (joined) return;
        setIsModalOpen(true);
    };

    const handleLeave = async () => {
        if (!bookingId && status !== 'waitlist') {
            alert('Cannot cancel: missing booking ID.');
            return;
        }

        const refundAmount = game.price || 0;
        const confirmMsg = status === 'waitlist' 
            ? 'Are you sure you want to leave the waitlist?' 
            : `Are you sure you want to cancel your spot?`;

        if (!confirm(confirmMsg)) {
            return;
        }

        setLoading(true);
        try {
            if (status === 'waitlist') {
                const response = await fetch('/api/leave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gameId: game.id })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                
                setJoined(false);
                setStatus(undefined);
                alert('You have left the waitlist.');
            } else {
                const result = await cancelBooking(bookingId!);
                if (!result.success) throw new Error(result.error);

                setJoined(false);
                setStatus(undefined);
                if (currentPlayers > 0) {
                    setCurrentPlayers(prev => Math.max(0, prev - 1));
                }
                if (result.refunded) {
                    alert(`Your spot was cancelled. $${refundAmount.toFixed(2)} has been credited to your Pitchside Wallet.`);
                } else {
                    alert('Your spot was cancelled.');
                }
            }

            router.refresh();
        } catch (error: any) {
            console.error('Cancel Error:', error);
            alert('Failed to cancel: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const [userProfile, setUserProfile] = useState<unknown>(null);

    useEffect(() => {
        if (user) {
            supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }: any) => {
                setUserProfile(data);
            });
        }
    }, [user, supabase]);

    const proceedToJoin = async (data: { note: string; paymentMethod: string | null; promoCodeId?: string; teamAssignment?: string; isFreeAgent?: boolean; event_type?: string; guestIds?: string[] }) => {
        setLoading(true);

        try {
            const { data: latestGame } = await supabase
                .from('games')
                .select('price')
                .eq('id', game.id)
                .single();

            const currentPrice = latestGame?.price || game.price;
            let finalCost = currentPrice;

            if (data.paymentMethod === 'stripe') {
                const checkoutRes = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameId: game.id,
                        userId: user!.id,
                        price: finalCost,
                        title: `Join Match: ${game.title || 'Pickup Game'}`,
                        note: data.note,
                        promoCodeId: data.promoCodeId,
                        teamAssignment: data.teamAssignment,
                        isFreeAgent: data.isFreeAgent,
                        event_type: 'pickup',
                        guestIds: data.guestIds || []
                    })
                });

                const responseData = await checkoutRes.json();
                if (!checkoutRes.ok) throw new Error(responseData.error);

                if (responseData.bypassed) {
                    setJoined(true);
                    setStatus('paid');
                    setCurrentPlayers(prev => prev + 1);
                    setIsModalOpen(false);
                    setLoading(false);
                    window.location.reload();
                    return;
                }

                setStripeClientSecret(responseData.clientSecret);
                setIsModalOpen(false);
                setLoading(false);
                return;
            }

            const isFull = game.max_players != null && currentPlayers >= game.max_players;
            if (finalCost === 0 || isFull || data.paymentMethod) {
                const endpoint = (isFull && !data.paymentMethod) ? '/api/waitlist' : '/api/join';

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameId: game.id,
                        note: data.note,
                        paymentMethod: data.paymentMethod || ((finalCost === 0) ? 'promo' : null),
                        promoCodeId: data.promoCodeId,
                        teamAssignment: data.teamAssignment,
                        guestIds: data.guestIds || []
                    })
                });

                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.error || responseData.message);
                if (responseData.message) {
                    toastError(responseData.message);
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
                    setCurrentPlayers(prev => prev + 1);
                    success("Successfully joined!");
                } else {
                    setStatus('waitlist');
                    success("You've been added to the waitlist!");
                }

                setIsModalOpen(false);
                setLoading(false);
                return;
            }

                        // @ts-expect-error - Residual typing mismatch from extended schema mapping
                        if (userProfile?.free_game_credits > 0) {
                                // @ts-expect-error - Residual typing mismatch from extended schema mapping
                                const useCredit = confirm(`You have ${userProfile.free_game_credits} Free Game Credit(s). Would you like to use one for this game?`);

                if (useCredit) {
                    const response = await fetch('/api/join-with-credit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            gameId: game.id,
                            note: data.note,
                            teamAssignment: data.teamAssignment
                        })
                    });

                    const responseData = await response.json();
                    if (!response.ok) throw new Error(responseData.error);

                    setJoined(true);
                    setStatus('paid');
                    setCurrentPlayers(prev => prev + 1);
                    success("Success! Free credit redeemed.");
                                        // @ts-expect-error - Residual typing mismatch from extended schema mapping
                                        setUserProfile({ ...userProfile, free_game_credits: userProfile.free_game_credits - 1 });

                    setIsModalOpen(false);
                    setLoading(false);
                    return;
                }
            }

            const checkoutRes = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: game.id,
                    userId: user!.id,
                    price: finalCost,
                    title: `Join Match: ${game.title || 'Pickup Game'}`,
                    note: data.note,
                    promoCodeId: data.promoCodeId,
                    teamAssignment: data.teamAssignment,
                    isFreeAgent: data.isFreeAgent,
                    event_type: 'pickup',
                    guestIds: data.guestIds || []
                })
            });

            const responseData = await checkoutRes.json();
            if (!checkoutRes.ok) throw new Error(responseData.error);

            if (responseData.bypassed) {
                setJoined(true);
                setStatus('paid');
                setCurrentPlayers(prev => prev + 1);
                setIsModalOpen(false);
                setLoading(false);
                window.location.reload();
                return;
            }

            setStripeClientSecret(responseData.clientSecret);
            setIsModalOpen(false);
            setLoading(false);

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
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <div className={cn(
                    "absolute top-0 left-0 w-1 h-full transition-colors z-20",
                    isCancelled ? "bg-red-500" : isCompleted ? "bg-green-500" : "bg-pitch-accent"
                )} />

                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1 mr-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="bg-pitch-accent/10 border border-pitch-accent/20 px-2 py-0.5 rounded-sm flex items-center justify-center">
                                    <span className="text-[10px] font-black uppercase text-pitch-accent tracking-widest whitespace-nowrap">Pickup Match</span>
                                </div>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-[0.85] mb-4 font-sans break-words overflow-hidden">
                                {game.title || `${game.game_format_type || game.game_format || '7v7'} Pickup`}
                            </h2>
                            <div className="flex flex-col gap-2 text-pitch-secondary text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
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
                            {(isCancelled || isCompleted) && (
                                <div className={cn(
                                    "px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest border",
                                    isCancelled ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                    "bg-green-500/10 text-green-400 border-green-500/20"
                                )}>
                                    {isCancelled ? 'Cancelled' : 'Completed'}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                            <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                                <Users className="w-4 h-4" /> Players
                            </div>
                            <div className="text-white font-black text-xs uppercase">{currentPlayers} / {game.max_players}</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                            <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                                <Zap className="w-4 h-4" /> Format
                            </div>
                            <div className="text-white font-bold text-xs uppercase">{game.game_format_type || game.game_format || 'Match'}</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                            <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-pitch-accent transition-colors flex items-center gap-1">
                                <DollarSign className="w-4 h-4" /> Fee
                            </div>
                            <div className="text-pitch-accent font-black text-xs uppercase">
                                {joined ? (status === 'waitlist' ? 'Waitlist' : 'Paid') : `$${game.price}`}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                        {isCancelled ? (
                            <div className="col-span-1 sm:col-span-2 py-4 bg-white/5 border border-white/10 text-gray-500 font-black uppercase text-center text-xs tracking-widest rounded-sm">
                                Event Cancelled
                            </div>
                        ) : joined ? (
                            <button
                                onClick={() => router.push(`/games/${game.id}`)}
                                className="col-span-1 sm:col-span-2 w-full py-5 bg-pitch-accent text-pitch-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.15)] rounded-sm group/btn min-h-[44px]"
                            >
                                Player Lobby <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <button
                                onClick={() => router.push(`/games/${game.id}`)}
                                className="col-span-1 sm:col-span-2 w-full py-5 bg-transparent border border-white/20 text-white font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all transform active:scale-95 flex items-center justify-center gap-2 rounded-sm group/btn min-h-[44px]"
                            >
                                Details <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <JoinGameModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={proceedToJoin}
                gamePrice={game.price}
                loading={loading}
                isWaitlist={game.max_players != null && currentPlayers >= game.max_players}
                gameId={game.id}
                isLeague={false}
            />

            {stripeClientSecret && (
                <EmbeddedCheckoutModal
                    isOpen={!!stripeClientSecret}
                    onClose={() => setStripeClientSecret(null)}
                    clientSecret={stripeClientSecret}
                />
            )}
        </>
    );
}
