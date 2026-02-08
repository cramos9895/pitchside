
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, Check, UserPlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';

interface Game {
    id: string;
    title: string;
    location: string;
    start_time: string;
    end_time: string | null;
    price: number;
    max_players: number;
    current_players: number;
    surface_type: string;
    status: string; // 'scheduled', 'active', 'completed', 'cancelled'
}

interface GameCardProps {
    game: Game;
    user: User | null;
}

export function GameCard({ game, user }: GameCardProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false);
    const [currentPlayers, setCurrentPlayers] = useState(game.current_players);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [teammateNote, setTeammateNote] = useState('');
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

    // Duration
    const diffMs = endDate.getTime() - gameDate.getTime();
    const diffMins = Math.floor(diffMs / 60000); // Floor to avoid rounding up 89.9
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const durationStr = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const startTimeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const endTimeStr = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const handleJoinClick = () => {
        if (!user) {
            router.push('/login');
            return;
        }
        if (joined || currentPlayers >= game.max_players) return;

        // Open Modal instead of immediate join
        setIsModalOpen(true);
    };

    const proceedToJoin = async () => {
        setLoading(true);
        // Close modal potentially here or after success? 
        // Let's keep it open showing loading state or close it?
        // Better UX: Close it, show loading on button? Or show loading in modal.
        // I'll show loading in modal button.

        try {
            // Check for Free Game
            if (game.price === 0) {
                const response = await fetch('/api/join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameId: game.id,
                        note: teammateNote
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                setJoined(true);
                setCurrentPlayers(prev => prev + 1);
                setIsModalOpen(false);
                setLoading(false);
                return;
            }

            // Paid Game
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: game.id,
                    userId: user!.id,
                    price: game.price,
                    title: `Join Match: ${game.title || 'Pickup Game'}`,
                    note: teammateNote
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            window.location.href = data.url;

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
                "group relative bg-pitch-card border border-white/5 p-6 rounded-sm transition-colors duration-300 flex flex-col h-full",
                isCancelled ? "opacity-75 grayscale hover:border-red-500/30" : "hover:border-pitch-accent/50"
            )}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-heading text-xl font-bold italic">{startTimeStr} - {endTimeStr}</h3>
                        <p className="text-sm font-bold text-gray-400">{durationStr}</p>
                        <p className="text-pitch-secondary text-sm font-bold uppercase">{dateStr}</p>
                    </div>
                    {isCancelled ? (
                        <div className="bg-red-500 px-2 py-1 rounded text-xs font-bold uppercase text-white shadow-lg shadow-red-500/20">
                            CANCELLED
                        </div>
                    ) : (
                        <div className="bg-white/5 px-2 py-1 rounded text-xs font-bold uppercase text-white">
                            {game.surface_type}
                        </div>
                    )}
                </div>

                <div className="space-y-2 mb-6 flex-grow">
                    <div className="flex items-center text-pitch-secondary">
                        <MapPin className="w-4 h-4 mr-2 text-pitch-accent" />
                        <span className="text-sm truncate">{game.location}</span>
                    </div>
                    <div className="flex items-center text-pitch-secondary">
                        <span className={cn(
                            "text-xs uppercase px-2 py-0.5 rounded font-bold",
                            currentPlayers >= game.max_players ? "bg-red-500/10 text-red-500" : "bg-white/5 text-gray-400"
                        )}>
                            {currentPlayers} / {game.max_players} Players
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                    <div className="text-lg font-bold text-white">${game.price}</div>

                    {isCancelled ? (
                        <button disabled className="px-4 py-2 border border-red-500/30 text-red-500 font-bold uppercase text-xs rounded-sm cursor-not-allowed flex items-center gap-2">
                            Event Cancelled
                        </button>
                    ) : joined ? (
                        <button disabled className="px-4 py-2 bg-white/10 text-gray-400 font-bold uppercase text-xs rounded-sm cursor-not-allowed flex items-center gap-2">
                            <Check className="w-4 h-4" /> Joined
                        </button>
                    ) : (
                        <button
                            onClick={handleJoinClick}
                            disabled={loading || currentPlayers >= game.max_players}
                            className={cn(
                                "px-4 py-2 text-sm font-bold uppercase transition-colors rounded-sm flex items-center gap-2",
                                currentPlayers >= game.max_players
                                    ? "bg-red-500/10 text-red-500 cursor-not-allowed"
                                    : game.price === 0
                                        ? "bg-green-500 hover:bg-green-400 text-black"
                                        : "text-pitch-accent hover:text-white hover:bg-pitch-accent/10"
                            )}
                        >
                            {currentPlayers >= game.max_players ? "Full" :
                                game.price === 0 ? "Join for Free" :
                                    <>Join for ${game.price} &rarr;</>
                            }
                        </button>
                    )}
                </div>
            </div>

            {/* JOIN MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-pitch-card border border-white/10 p-6 rounded-sm max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <h2 className="font-heading text-2xl font-bold italic uppercase flex items-center gap-2">
                                <UserPlus className="w-6 h-6 text-pitch-accent" />
                                Bring a <span className="text-pitch-accent">Friend?</span>
                            </h2>
                            <p className="text-pitch-secondary text-sm mt-2">
                                Heading to the pitch with someone? Enter their name so we can try to put you on the same team.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                    Teammate Request (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mike Johnson"
                                    value={teammateNote}
                                    onChange={(e) => setTeammateNote(e.target.value)}
                                    className="w-full bg-black/50 border border-white/20 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                />
                            </div>

                            <button
                                onClick={proceedToJoin}
                                disabled={loading}
                                className="w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                    game.price === 0 ? "Confirm & Join" : `Continue to Checkout ($${game.price})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
