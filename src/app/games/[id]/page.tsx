
'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Clock, Users, MessageSquare, Info, Shirt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/ChatInterface';

// Reuse types/interfaces if possible, or define locally for now
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
    status: string;
    description?: string; // Optional field if it exists
    teams_config?: { name: string; color: string }[];
}

interface Booking {
    id: string;
    status: string;
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
    const [activeTab, setActiveTab] = useState<'details' | 'roster' | 'chat'>('details');
    const [game, setGame] = useState<Game | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Derived state
    const [isParticipant, setIsParticipant] = useState(false);
    const [userBooking, setUserBooking] = useState<Booking | null>(null);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchGameData = async () => {
            setLoading(true);

            // 1. Get User
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

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

            // 3. Get Roster (Active/Paid/Waitlist)
            const { data: rosterData, error: rosterError } = await supabase
                .from('bookings')
                .select('*, profiles(full_name, email)')
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
                    } else if (myBooking && myBooking.status === 'waitlist') {
                        // User decided Waitlist can see chat? "Participants & Admins".
                        // Let's allow waitlist to see chat for now to keep them engaged.
                        setIsParticipant(true);
                        setUserBooking(myBooking);
                    }

                    // Check Admin role
                    const { data: roleData } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .in('role', ['admin', 'master_admin'])
                        .maybeSingle(); // Use maybeSingle to avoid error if no role

                    if (roleData) setIsParticipant(true);
                }
            }
            setLoading(false);
        };

        fetchGameData();
    }, [gameId, supabase]);

    if (loading) return <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white"><Loader2 className="animate-spin w-8 h-8" /></div>;
    if (!game) return <div className="min-h-screen bg-pitch-black pt-32 text-center text-white">Game not found.</div>;

    const gameDate = new Date(game.start_time);
    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Filter active roster for sorting/display
    const activeRoster = bookings.filter(b => ['active', 'paid'].includes(b.status));
    const waitlist = bookings.filter(b => b.status === 'waitlist');

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pb-20">
            {/* Header Image / Gradient */}
            <div className="h-48 md:h-64 bg-gradient-to-b from-pitch-accent/20 to-pitch-black relative">
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
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-pitch-accent" /> {game.location}</div>
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
                        onClick={() => setActiveTab('chat')}
                        className={cn(
                            "px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 shrink-0",
                            activeTab === 'chat' ? "border-pitch-accent text-white" : "border-transparent text-gray-500 hover:text-white"
                        )}
                    >
                        <MessageSquare className="w-4 h-4" /> Chat
                    </button>
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* DETAILS TAB */}
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-6">
                                <section className="bg-pitch-card border border-white/10 p-6 rounded-sm">
                                    <h3 className="font-heading text-xl font-bold italic uppercase mb-4 text-pitch-accent">Game Info</h3>
                                    <div className="space-y-4 text-gray-300">
                                        <p><strong>Surface:</strong> {game.surface_type}</p>
                                        <p><strong>Format:</strong> {game.max_players / 2}v{game.max_players / 2}</p>
                                        <p><strong>Price:</strong> ${game.price}</p>
                                        {game.description && <p className="mt-4 pt-4 border-t border-white/10">{game.description}</p>}
                                    </div>
                                </section>

                                {/* Team Assignment (if joined and assigned) */}
                                {userBooking?.team_assignment && (
                                    <section className="bg-gradient-to-r from-pitch-card to-white/5 border border-white/10 p-6 rounded-sm">
                                        <h3 className="font-heading text-lg font-bold italic uppercase mb-2 flex items-center gap-2">
                                            <Shirt className="w-5 h-5" /> Your Team
                                        </h3>
                                        <p className="text-xl font-black text-white">{userBooking.team_assignment}</p>
                                        <p className="text-sm text-gray-400 mt-1">Get ready to dominate!</p>
                                    </section>
                                )}
                            </div>

                            {/* Side Panel (Map placeholder or rules) */}
                            <div className="md:col-span-1 space-y-6">
                                <div className="bg-white/5 p-6 rounded-sm border border-white/10">
                                    <h4 className="font-bold uppercase text-sm mb-4 text-gray-400">Location</h4>
                                    <div className="aspect-video bg-gray-800 rounded mb-4 flex items-center justify-center text-gray-600 text-xs">
                                        Map View
                                    </div>
                                    <p className="font-bold text-sm">{game.location}</p>
                                </div>

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
                                            onClick={async () => {
                                                if (confirm(userBooking.status === 'waitlist' ? 'Leave waitlist?' : 'Are you sure you want to leave the game?')) {
                                                    setLoading(true);
                                                    try {
                                                        const res = await fetch('/api/leave', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ gameId: game.id })
                                                        });
                                                        if (!res.ok) throw new Error('Failed to leave');
                                                        router.refresh();
                                                        window.location.reload(); // Hard reload to update state
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert('Failed to leave game.');
                                                        setLoading(false);
                                                    }
                                                }
                                            }}
                                            className="w-full text-center px-4 py-2 border border-red-500/30 text-red-500 text-xs font-bold uppercase hover:bg-red-500 hover:text-white transition-colors rounded-sm"
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
                                                                <div className="text-xs text-gray-500 uppercase font-bold mt-0.5">
                                                                    Team: {player.team_assignment}
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
                                <ChatInterface
                                    gameId={gameId}
                                    currentUserId={currentUser.id}
                                    isParticipant={isParticipant}
                                />
                            )}
                        </div>
                    )}

                </div>
            </div>
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
