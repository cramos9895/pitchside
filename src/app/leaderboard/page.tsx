
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Trophy, Loader2, Medal, Crown, Shield, Activity, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerStats {
    id: string;
    full_name: string;
    avatar_url: string | null;
    position: string | null;
    ovr: number;
    raw_ovr: number;
    wins: number;
    draws: number;
    losses: number;
    matches_played: number;
    mvps: number;
    win_percentage: number;
}

export default function LeaderboardPage() {
    const [loading, setLoading] = useState(true);
    const [allPlayers, setAllPlayers] = useState<PlayerStats[]>([]);
    const [sortMode, setSortMode] = useState<'ovr' | 'games' | 'win_percentage'>('ovr');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [debugGames, setDebugGames] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // 1. Get Current User (for highlighting)
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            // 2. Fetch Profiles (Base List)
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, position');

            if (profilesError) {
                console.error("Error fetching profiles:", profilesError);
                setLoading(false);
                return;
            }

            // 3. Fetch Completed Games with Details
            const { data: games, error: gamesError } = await supabase
                .from('games')
                .select(`
                    id,
                    status,
                    mvp_player_id,
                    winning_team_assignment,
                    bookings (
                        user_id,
                        team_assignment,
                        status,
                        is_winner
                    )
                `)
                .eq('status', 'completed');

            if (gamesError) {
                console.error("Error fetching games:", gamesError);
                setLoading(false);
                return;
            }

            // 4. Calculate Stats
            const statsMap = new Map<string, PlayerStats>();

            // Initialize all profiles
            profiles.forEach(p => {
                statsMap.set(p.id, {
                    id: p.id,
                    full_name: p.full_name || 'Anonymous',
                    avatar_url: p.avatar_url,
                    position: p.position,
                    ovr: 0,
                    raw_ovr: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    matches_played: 0,
                    mvps: 0,
                    win_percentage: 0
                });
            });

            // Iterate Games
            games.forEach((game: any) => {
                // Count MVP
                if (game.mvp_player_id && statsMap.has(game.mvp_player_id)) {
                    statsMap.get(game.mvp_player_id)!.mvps += 1;
                }

                // REVISED APPROACH: Use explicit winning_team_assignment OR legacy is_winner

                // Pre-compute if the game had any winner recorded to distinguish Losses from True Draws
                const gameHadWinner = game.bookings.some((b: any) => b.is_winner === true) || !!game.winning_team_assignment;

                game.bookings.forEach((booking: any) => {
                    if (booking.status !== 'paid' && booking.status !== 'active' && booking.status !== 'confirmed') return;

                    const pid = booking.user_id;
                    if (!statsMap.has(pid)) return;

                    const playerStats = statsMap.get(pid)!;
                    playerStats.matches_played += 1;

                    const myTeam = booking.team_assignment;
                    const isExplicitWin = booking.is_winner === true || (myTeam && game.winning_team_assignment && String(myTeam) === String(game.winning_team_assignment));

                    if (isExplicitWin) {
                        playerStats.wins += 1;
                    } else if (gameHadWinner) {
                        playerStats.losses += 1;
                    } else {
                        playerStats.draws += 1;
                    }
                });
            });

            // 5. Final Calculations & Sort
            const processedPlayers = Array.from(statsMap.values())
                .filter(p => p.matches_played > 0)
                .map(p => {
                    const rawBonus = (p.matches_played * 0.1) + (p.draws * 0.1) + (p.wins * 0.5);
                    let finalBonus = 0;
                    if (rawBonus <= 10) finalBonus = rawBonus;
                    else if (rawBonus <= 23.33) finalBonus = 10 + ((rawBonus - 10) * 0.75);
                    else finalBonus = 20 + ((rawBonus - 23.33) * 0.5);

                    return {
                        ...p,
                        ovr: Math.min(99, Math.floor(70 + finalBonus)),
                        raw_ovr: 70 + finalBonus,
                        win_percentage: p.matches_played > 0 ? (p.wins / p.matches_played) * 100 : 0
                    };
                });

            // Make initial unsorted copy
            setAllPlayers(processedPlayers);
            setLoading(false);
        };

        fetchData();
    }, [supabase]);

    if (loading) return <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    // Dynamic Sorter
    const sortedPlayers = [...allPlayers].sort((a, b) => {
        if (sortMode === 'ovr' && b.raw_ovr !== a.raw_ovr) return b.raw_ovr - a.raw_ovr;
        if (sortMode === 'games' && b.matches_played !== a.matches_played) return b.matches_played - a.matches_played;
        if (sortMode === 'win_percentage' && b.win_percentage !== a.win_percentage) return b.win_percentage - a.win_percentage;

        // Fallbacks
        if (b.raw_ovr !== a.raw_ovr) return b.raw_ovr - a.raw_ovr;
        if (b.mvps !== a.mvps) return b.mvps - a.mvps;
        if (b.win_percentage !== a.win_percentage) return b.win_percentage - a.win_percentage;
        return a.full_name.localeCompare(b.full_name);
    });

    const top3 = sortedPlayers.slice(0, 3);
    const rest = sortedPlayers.slice(3);

    return (
        <div className="min-h-screen bg-pitch-black text-white p-6 pt-2 font-sans flex flex-col items-center">
            <div className="w-full max-w-4xl mb-8 flex justify-between items-center">
                <Link href="/" className="flex items-center text-pitch-secondary hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pitch
                </Link>
                <h1 className="font-heading text-4xl font-bold uppercase italic tracking-tighter shadow-pitch-accent/50 drop-shadow-md">
                    Global <span className="text-pitch-accent pt-1">Leaderboard</span>
                </h1>
                <div className="w-20" /> {/* Spacer */}
            </div>

            {/* SORTING TABS */}
            <div className="w-full max-w-4xl flex items-center justify-center gap-2 mb-28 px-4">
                <button
                    onClick={() => setSortMode('ovr')}
                    className={cn(
                        "px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 border",
                        sortMode === 'ovr' ? "bg-pitch-accent text-black border-pitch-accent shadow-[0_0_15px_rgba(235,255,0,0.3)]" : "bg-black/40 text-gray-400 border-white/10 hover:border-white/30"
                    )}
                >
                    <Trophy className="w-4 h-4" /> OVR
                </button>
                <button
                    onClick={() => setSortMode('games')}
                    className={cn(
                        "px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 border",
                        sortMode === 'games' ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "bg-black/40 text-gray-400 border-white/10 hover:border-white/30"
                    )}
                >
                    <Activity className="w-4 h-4" /> Games
                </button>
                <button
                    onClick={() => setSortMode('win_percentage')}
                    className={cn(
                        "px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 border",
                        sortMode === 'win_percentage' ? "bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "bg-black/40 text-gray-400 border-white/10 hover:border-white/30"
                    )}
                >
                    <TrendingUp className="w-4 h-4" /> Win %
                </button>
            </div>

            {/* HERO PODIUM */}
            <div className="flex flex-row items-end justify-center gap-2 md:gap-8 mb-24 w-full max-w-4xl px-2 md:px-4">
                {/* 2nd Place */}
                {top3[1] && <PodiumCard player={top3[1]} rank={2} />}

                {/* 1st Place */}
                {top3[0] && <PodiumCard player={top3[0]} rank={1} />}

                {/* 3rd Place */}
                {top3[2] && <PodiumCard player={top3[2]} rank={3} />}
            </div>

            {/* RANKINGS TABLE */}
            <div className="w-full max-w-4xl bg-pitch-card border border-white/5 rounded-sm overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-xs text-pitch-secondary uppercase tracking-wider">
                            <th className="p-4 w-16 text-center">Rank</th>
                            <th className="p-4">Player</th>
                            <th className="p-4 text-center text-pitch-accent">OVR</th>
                            <th className="p-4 text-center hidden md:table-cell">Games</th>
                            <th className="p-4 text-center hidden md:table-cell">Record</th>
                            <th className="p-4 text-center hidden md:table-cell">MVPs</th>
                            <th className="p-4 text-center md:hidden">Stats</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rest.map((player, index) => (
                            <tr
                                key={player.id}
                                className={cn(
                                    "hover:bg-white/5 transition-colors group",
                                    currentUser?.id === player.id ? "bg-pitch-accent/10 hover:bg-pitch-accent/20 border-l-4 border-l-pitch-accent" : ""
                                )}
                            >
                                <td className="p-4 text-center font-mono font-bold text-white/50 group-hover:text-white">
                                    {index + 4}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                                            {player.avatar_url ? (
                                                <img src={player.avatar_url} alt={player.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/30">
                                                    {player.full_name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className={cn("font-bold text-sm", currentUser?.id === player.id ? "text-pitch-accent" : "text-white")}>
                                                {player.full_name}
                                            </div>
                                            <div className="text-[10px] text-pitch-secondary uppercase md:hidden">
                                                {player.matches_played} GMS • {player.wins}W {player.draws}D {player.losses}L • {player.mvps} MVPs
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-center font-black italic text-lg text-pitch-accent drop-shadow-sm">{player.ovr}</td>
                                <td className="p-4 text-center font-mono text-sm hidden md:table-cell text-white/70">
                                    {player.matches_played}
                                </td>
                                <td className="p-4 text-center font-mono text-sm hidden md:table-cell text-white/70">
                                    <span className="text-green-400 font-bold">{player.wins}W</span>{' '}
                                    <span className="text-gray-400 font-bold">{player.draws}D</span>{' '}
                                    <span className="text-red-400 font-bold">{player.losses}L</span>
                                </td>
                                <td className="p-4 text-center hidden md:table-cell">
                                    {player.mvps > 0 ? (
                                        <div className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full text-xs font-bold border border-yellow-500/20">
                                            <Trophy className="w-3 h-3" /> {player.mvps}
                                        </div>
                                    ) : (
                                        <span className="text-white/20">-</span>
                                    )}
                                </td>
                                <td className="p-4 md:hidden">
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className="text-sm font-black text-pitch-accent">{player.ovr} OVR</div>
                                        <div className="text-[10px] uppercase font-bold text-pitch-secondary tracking-widest block">
                                            {player.matches_played} GMS
                                        </div>
                                        <div className="text-[10px] uppercase font-bold text-pitch-secondary tracking-widest block">
                                            {player.wins}W {player.draws}D {player.losses}L
                                        </div>
                                        {player.mvps > 0 && (
                                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-500">
                                                <Trophy className="w-2 h-2" /> {player.mvps} MVP{player.mvps > 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rest.length === 0 && top3.length > 0 && (
                    <div className="p-8 text-center text-pitch-secondary italic">
                        No other ranked players yet.
                    </div>
                )}
                {allPlayers.length === 0 && (
                    <div className="p-8 text-center text-pitch-secondary italic">
                        No matches recorded yet. Be the first to play!
                    </div>
                )}
            </div>
        </div>
    );
}

function PodiumCard({ player, rank }: { player: PlayerStats, rank: number }) {
    let order = "order-3 md:order-3"; // 3rd mapping
    let scale = "scale-90 md:scale-95";

    if (rank === 1) {
        order = "order-1 md:order-2"; // Center
        scale = "scale-110 md:scale-125 z-10";
    } else if (rank === 2) {
        order = "order-2 md:order-1"; // Left
        scale = "scale-100 md:scale-105";
    }

    const ovr = player.ovr;
    let cardGradient = "bg-gradient-to-br from-[#8c5a3b] via-[#b67352] to-[#512c17] border-[#cc8a63] shadow-[0_0_30px_rgba(182,115,82,0.4)] text-[#ffece0]";
    let holographic = "";
    let textColor = "text-amber-100";
    let accentColor = "text-amber-200/60";

    if (rank === 1) { // Gold Tier style for 1st
        cardGradient = "bg-gradient-to-br from-[#bf953f] via-[#fcf6ba] to-[#b38728] border-[#fcf6ba] shadow-[0_0_35px_rgba(252,246,186,0.5)] text-yellow-900";
        holographic = "after:absolute after:inset-0 after:bg-gradient-to-tr after:from-transparent after:via-white/40 after:to-transparent after:-translate-x-full hover:after:animate-[shimmer_2.5s_infinite]";
        textColor = "text-yellow-900";
        accentColor = "text-yellow-800/60";
    } else if (rank === 2) { // Silver Tier style for 2nd
        cardGradient = "bg-gradient-to-br from-[#757f9a] via-[#e2e8f0] to-[#656d81] border-[#f8fafc] shadow-[0_0_30px_rgba(226,232,240,0.3)] text-gray-900";
        holographic = "after:absolute after:inset-0 after:bg-gradient-to-tr after:from-transparent after:via-white/20 after:to-transparent after:-translate-x-full hover:after:animate-[shimmer_3s_infinite]";
        textColor = "text-gray-900";
        accentColor = "text-gray-800/60";
    }

    // Convert Win Percentage
    const winPct = Math.round(player.win_percentage) + '%';

    return (
        <div className={cn("flex flex-col items-center justify-end flex-1 max-w-[200px] transition-transform duration-500 hover:-translate-y-2 group cursor-pointer", order, scale)}>
            {/* The Drop Shadow Wrapper */}
            <div className="w-full relative drop-shadow-lg">
                {rank === 1 && (
                    <Crown className="w-8 h-8 text-yellow-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce z-20 drop-shadow-md" />
                )}

                {/* The Clipped Shape */}
                <div
                    className={cn(
                        "w-full flex flex-col items-center pt-6 pb-12 px-2 relative overflow-hidden shadow-[inset_0_0_0_4px_rgba(255,255,255,0.3)]",
                        cardGradient,
                        holographic
                    )}
                    style={{
                        clipPath: 'polygon(50% 0%, 100% 10%, 100% 85%, 50% 100%, 0% 85%, 0% 10%)'
                    }}
                >
                    {/* Inner Golden Ratio Border (Optional FUT vibe) */}
                    <div
                        className="absolute inset-1 border border-white/30 mix-blend-overlay pointer-events-none"
                        style={{
                            clipPath: 'polygon(50% 0%, 100% 10%, 100% 85%, 50% 100%, 0% 85%, 0% 10%)'
                        }}
                    />

                    {/* Rank Number Background Watermark */}
                    <div className={cn("font-heading font-black text-8xl absolute top-6 left-1/2 -translate-x-1/2 opacity-10 select-none", textColor)}>
                        {rank}
                    </div>

                    {/* Avatar */}
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-[3px] border-white/50 overflow-hidden shadow-2xl relative z-10 mb-2 bg-pitch-black">
                        {player.avatar_url ? (
                            <img src={player.avatar_url} alt={player.full_name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-3xl text-white/50">
                                {player.full_name.charAt(0)}
                            </div>
                        )}
                    </div>

                    {/* Name */}
                    <h3 className={cn("font-heading font-black italic uppercase text-sm md:text-lg leading-tight tracking-wider text-center w-full px-1 z-10 truncate", textColor)}>
                        {player.full_name}
                    </h3>

                    {/* Divider */}
                    <div className="w-3/4 h-px bg-black/20 my-2 z-10" />

                    {/* FUT Stats 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full px-2 md:px-4 z-10 mb-1 drop-shadow-sm">
                        <div className="flex justify-between items-center whitespace-nowrap">
                            <span className={cn("font-bold text-sm md:text-base", textColor)}>{player.ovr}</span>
                            <span className={cn("uppercase text-[9px] md:text-[10px] font-bold tracking-widest pl-1", accentColor)}>OVR</span>
                        </div>
                        <div className="flex justify-between items-center whitespace-nowrap">
                            <span className={cn("font-bold text-sm md:text-base", textColor)}>{player.matches_played}</span>
                            <span className={cn("uppercase text-[9px] md:text-[10px] font-bold tracking-widest pl-1", accentColor)}>GMS</span>
                        </div>
                        <div className="flex justify-between items-center whitespace-nowrap">
                            <span className={cn("font-bold text-sm md:text-base", textColor)}>{player.wins}</span>
                            <span className={cn("uppercase text-[9px] md:text-[10px] font-bold tracking-widest pl-1", accentColor)}>W</span>
                        </div>
                        <div className="flex justify-between items-center whitespace-nowrap">
                            <span className={cn("font-bold text-sm md:text-base", textColor)}>{winPct}</span>
                            <span className={cn("uppercase text-[9px] md:text-[10px] font-bold tracking-widest pl-1", accentColor)}>W%</span>
                        </div>
                    </div>
                    {player.mvps > 0 && (
                        <div className="z-10 mt-1 inline-flex items-center gap-1 bg-black/10 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase border border-white/10" style={{ color: rank === 1 ? '#000' : '#fff' }}>
                            <Trophy className="w-2.5 h-2.5 opacity-80" /> {player.mvps} MVP
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
