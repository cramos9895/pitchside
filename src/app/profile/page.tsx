
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Edit2, Save, Trophy, Loader2, Upload, Camera, Shield, User, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/4205/4205634.png";


export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [stats, setStats] = useState({ caps: 0, wins: 0, draws: 0, losses: 0 });
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            setUser(user);

            // Get Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setProfile(profileData);

            // Fetch Bookings with Game Details and Matches
            const { data: bookingsData } = await supabase
                .from('bookings')
                .select(`
                    *,
                    game:games(
                        *,
                        matches(*),
                        bookings(is_winner)
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            setBookings(bookingsData || []);

            // Calculate Stats
            const caps = bookingsData?.filter((b: any) => b.status === 'paid').length || 0;

            // Calculate Stats properly (W/D/L)
            let wins = 0;
            let draws = 0;
            let losses = 0;

            const validBookings = bookingsData?.filter((b: any) => {
                const g = b.game;
                // Count played games
                if (!g || (b.status !== 'paid' && b.status !== 'active' && b.status !== 'confirmed') || g.status !== 'completed') return false;

                const myTeam = b.team_assignment;
                let isWin = false;
                let isLoss = false;
                let isDraw = false;

                // Pre-compute if the game had any winner recorded to distinguish Losses from True Draws (specifically for legacy games)
                const gameHadWinner = g.bookings?.some((bk: any) => bk.is_winner === true) || !!g.winning_team_assignment;

                if (b.is_winner === true || (myTeam && g.winning_team_assignment && String(myTeam) === String(g.winning_team_assignment))) {
                    isWin = true;
                } else if (gameHadWinner) {
                    isLoss = true;
                } else {
                    isDraw = true;
                }

                if (isWin) {
                    wins++;
                    b.calculated_result = 'win';
                } else if (isLoss) {
                    losses++;
                    b.calculated_result = 'loss';
                } else {
                    draws++;
                    b.calculated_result = 'draw';
                }

                return true;
            }) || [];

            setStats({
                caps: validBookings.length,
                wins,
                draws,
                losses
            });
            setLoading(false);
        };

        fetchProfile();
    }, [supabase, router]);

    // New "Slow Burn" Rating Calculation
    const baseRating = 70;

    // Calculate raw bonus points
    const rawBonus = (stats.caps * 0.1) + (stats.draws * 0.1) + (stats.wins * 0.5);

    // Apply diminishing returns curve
    let finalBonus = 0;

    if (rawBonus <= 10) {
        // Linear until OVR 80 (70 + 10)
        finalBonus = rawBonus;
    } else if (rawBonus <= 23.33) {
        // -25% growth penalty after OVR 80.
        // Needs 13.33 raw points * 0.75 = 10 actual points to reach OVR 90
        finalBonus = 10 + ((rawBonus - 10) * 0.75);
    } else {
        // -50% growth penalty after OVR 90.
        finalBonus = 20 + ((rawBonus - 23.33) * 0.5);
    }

    const ovr = Math.min(99, Math.floor(baseRating + finalBonus));

    // Rating Tier Logic (Bronze 70-79, Silver 80-89, Gold 90-94, Diamond 95-99)
    let cardGradient = "bg-gradient-to-br from-[#8c5a3b] via-[#b67352] to-[#512c17] border-[#cc8a63] shadow-[0_0_30px_rgba(182,115,82,0.4)] text-[#ffece0]";
    let holographic = ""; // No shimmer for Bronze
    let badgeStyle = "text-[#ffcaad] border-[#ffcaad] bg-black/20";
    let isNeon = false;

    if (ovr >= 95) {
        // Diamond 
        cardGradient = "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-300 via-white to-indigo-300 border-white shadow-[0_0_50px_rgba(255,255,255,0.7)] text-indigo-900";
        holographic = "after:absolute after:inset-0 after:bg-gradient-to-tr after:from-transparent after:via-white/60 after:to-transparent after:-translate-x-full hover:after:animate-[shimmer_2s_infinite]";
        badgeStyle = "text-blue-700 font-bold border-blue-400 bg-white/40 shadow-sm";
    } else if (ovr >= 90) {
        // Gold 
        cardGradient = "bg-gradient-to-br from-[#bf953f] via-[#fcf6ba] to-[#b38728] border-[#fcf6ba] shadow-[0_0_40px_rgba(252,246,186,0.5)] text-yellow-900";
        holographic = "after:absolute after:inset-0 after:bg-gradient-to-tr after:from-transparent after:via-white/40 after:to-transparent after:-translate-x-full hover:after:animate-[shimmer_2.5s_infinite]";
        badgeStyle = "text-amber-800 font-bold border-amber-600 bg-white/30";
    } else if (ovr >= 80) {
        // Silver 
        cardGradient = "bg-gradient-to-br from-[#757f9a] via-[#e2e8f0] to-[#656d81] border-[#f8fafc] shadow-[0_0_35px_rgba(226,232,240,0.3)] text-gray-900";
        holographic = "after:absolute after:inset-0 after:bg-gradient-to-tr after:from-transparent after:via-white/20 after:to-transparent after:-translate-x-full hover:after:animate-[shimmer_3s_infinite]";
        badgeStyle = "text-slate-800 font-bold border-slate-500 bg-white/40";
    }

    if (loading) return <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-pitch-black text-white p-6 pt-32 font-sans flex flex-col items-center">
            <div className="w-full max-w-2xl mb-8 flex justify-between items-center">
                <Link href="/" className="flex items-center text-pitch-secondary hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pitch
                </Link>

            </div>

            {/* FIFA CARD CONTAINER */}
            <div className={cn(
                "relative w-full max-w-sm aspect-[2/3] rounded-xl shadow-[inset_0_0_0_6px_rgba(255,255,255,0.2)] overflow-hidden flex flex-col items-center pt-8 text-center select-none transform transition-transform hover:scale-[1.02] cursor-pointer group",
                cardGradient,
                holographic
            )}>

                {/* Card Background pattern */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />

                {/* Rating & Position (Top Left) */}
                <div className="absolute top-8 left-8 text-left z-10 flex flex-col items-center drop-shadow-md">
                    {/* Stat Shield */}
                    <div className={cn("w-16 h-16 border-2 flex items-center justify-center rounded-full mb-1 backdrop-blur-md shadow-lg", badgeStyle)}>
                        <span className="text-4xl font-black italic leading-none">{ovr}</span>
                    </div>
                    <div className={cn("text-lg font-bold uppercase tracking-wider", badgeStyle.replace('bg-white/40', '').replace('bg-white/30', '').replace('bg-black/20', '').split(' ')[0])}>
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
                <div className="relative z-10 uppercase w-full px-4 mb-2 drop-shadow-md">
                    <h2 className="font-heading text-3xl font-bold italic truncate">
                        {profile?.full_name || 'ROOKIE'}
                    </h2>
                </div>

                {/* Divider */}
                <div className="w-2/3 h-0.5 bg-current opacity-30 mb-6 z-10" />

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-left w-full px-12 z-10 font-mono text-sm drop-shadow-sm">
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
                        <span className="font-bold opacity-70">PAS</span>
                        <span className="font-black text-lg">79</span>
                    </div>
                </div>

                {/* Bio / Footer */}
                <div className="mt-auto mb-8 w-full px-6 z-10 drop-shadow-sm">
                    <p className="text-xs font-bold italic line-clamp-2 min-h-[2.5em] opacity-80">
                        {profile?.bio || "No bio yet. Ready to play!"}
                    </p>
                </div>
            </div>

            {/* CAREER STATS SECTION */}
            <div className="w-full max-w-sm mt-8 grid grid-cols-2 gap-4 mb-8">
                <div className="bg-pitch-card p-4 rounded-sm border border-white/10 text-center flex flex-col items-center shadow-lg">
                    <span className="text-3xl font-heading font-black italic text-white mb-1">{stats.caps}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-pitch-secondary">APPS</span>
                </div>
                <div className="bg-pitch-card p-4 rounded-sm border border-white/10 text-center flex flex-col items-center shadow-lg">
                    <span className="text-3xl font-heading font-black italic text-green-500 mb-1">{stats.wins}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-pitch-secondary">WINS</span>
                </div>
            </div>

            {/* MATCH HISTORY */}
            <div className="w-full max-w-2xl px-4 pb-20">
                <h3 className="font-heading text-xl font-bold italic uppercase mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-pitch-accent" />
                    Match History
                </h3>

                <div className="space-y-4">
                    {bookings.map((booking: any) => {
                        const game = booking.game;
                        if (!game || game.status !== 'completed' || !booking.calculated_result) return null;

                        const result = booking.calculated_result; // 'win' | 'loss' | 'draw'

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
                                            {new Date(game.start_time).toLocaleDateString()} • {game.location || 'PitchSide'}
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
                    {bookings.filter((b: any) => b.calculated_result).length === 0 && (
                        <p className="text-center text-gray-500 italic py-8">No match history recorded yet.</p>
                    )}
                </div>
            </div>

        </div>
    );
}

function formatPosition(pos: string) {
    if (pos === 'Forward') return 'FWD';
    if (pos === 'Midfielder') return 'MID';
    if (pos === 'Defender') return 'DEF';
    if (pos === 'Goalkeeper') return 'GK';
    return 'UTL';
}
