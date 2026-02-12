
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
    const [stats, setStats] = useState({ caps: 0, wins: 0 });
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
                        matches(*)
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            setBookings(bookingsData || []);

            // Calculate Stats
            const caps = bookingsData?.filter((b: any) => b.status === 'paid').length || 0;

            // Calculate Wins dynamically using MATCHES table
            const wins = bookingsData?.filter((b: any) => {
                const g = b.game;
                if (!g || b.status !== 'paid') return false;

                const myTeam = b.team_assignment; // e.g. "Team A"
                if (!myTeam || !g.matches || g.matches.length === 0) return false;

                // Simple Logic: Iterate all matches for this game. 
                // If I am Team A, did Team A win?
                // For simplified "Game Result", let's aggregate points or just check if *any* match was won? 
                // User requirement: "Career W-L-D". 
                // Usually taking the "Final" result is best. 
                // Let's assume the sum of goals determines the winner if multiple matches.

                let myGoals = 0;
                let oppGoals = 0;
                let played = false;

                g.matches.forEach((m: any) => {
                    if (m.status !== 'completed') return;

                    if (m.home_team === myTeam) {
                        myGoals += m.home_score;
                        oppGoals += m.away_score;
                        played = true;
                    } else if (m.away_team === myTeam) {
                        myGoals += m.away_score;
                        oppGoals += m.home_score;
                        played = true;
                    }
                });

                if (!played) return false;
                return myGoals > oppGoals;
            }).length || 0;

            setStats({
                caps,
                wins
            });
            setLoading(false);
        };

        fetchProfile();
    }, [supabase, router]);

    // New "Slow Burn" Rating Calculation
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
                        <span className="font-bold opacity-70">PAS</span>
                        <span className="font-black text-lg">79</span>
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

            {/* CREDITS BANNER */}
            {profile?.free_game_credits > 0 && (
                <div className="w-full max-w-sm mb-8 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/50 p-4 rounded-sm flex items-center justify-between shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-xl shadow-lg">
                            🏆
                        </div>
                        <div>
                            <p className="font-bold text-yellow-400 uppercase text-sm tracking-wider">Rewards Available</p>
                            <p className="text-white text-xs">You have <span className="font-bold text-white text-sm">{profile.free_game_credits} Free Game Credit{profile.free_game_credits !== 1 ? 's' : ''}</span></p>
                        </div>
                    </div>
                </div>
            )}

            {/* MATCH HISTORY */}
            <div className="w-full max-w-2xl px-4 pb-20">
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
                        let opponentName = "Opponent";

                        game.matches.forEach((m: any) => {
                            if (m.status !== 'completed') return;
                            if (m.home_team === myTeam) {
                                myScore += m.home_score;
                                oppScore += m.away_score;
                                opponentName = m.away_team; // grab last opponent name
                                played = true;
                            } else if (m.away_team === myTeam) {
                                myScore += m.away_score;
                                oppScore += m.home_score;
                                opponentName = m.home_team;
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
                                    <div className="text-center">
                                        <span className="block text-xs font-bold text-pitch-secondary uppercase mb-1">vs {opponentName}</span>
                                        <span className="font-mono font-black text-xl tracking-widest">
                                            {myScore} - {oppScore}
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
    );
}

function formatPosition(pos: string) {
    if (pos === 'Forward') return 'FWD';
    if (pos === 'Midfielder') return 'MID';
    if (pos === 'Defender') return 'DEF';
    if (pos === 'Goalkeeper') return 'GK';
    return 'UTL';
}
