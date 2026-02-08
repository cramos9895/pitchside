
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

            // Get Stats (Caps & Wins)
            // 1. Caps
            const { count: capsCount } = await supabase
                .from('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'paid');

            // 2. Wins (is_winner = true)
            const { count: winsCount } = await supabase
                .from('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'paid')
                .eq('is_winner', true);

            setStats({
                caps: capsCount || 0,
                wins: winsCount || 0
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
            <div className="w-full max-w-sm mt-8 grid grid-cols-3 gap-4">
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
