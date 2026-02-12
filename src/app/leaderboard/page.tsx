
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Trophy, Loader2, Medal, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

interface PlayerStats {
    id: string;
    full_name: string;
    avatar_url: string | null;
    position: string | null;
    points: number;
    wins: number;
    draws: number;
    losses: number;
    matches_played: number;
    mvps: number;
    win_percentage: number;
}

export default function LeaderboardPage() {
    const [loading, setLoading] = useState(true);
    const [players, setPlayers] = useState<PlayerStats[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const supabase = createClient();
    const pathname = usePathname();

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
                    matches (
                        home_team,
                        away_team,
                        home_score,
                        away_score,
                        status
                    ),
                    bookings (
                        user_id,
                        team_assignment,
                        status
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
                    points: 0,
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

                // Determine Match Results for this game
                // If multiple matches, we can treat them individually OR aggregate.
                // Profile logic was: Aggregate goals for "Game Winner".
                // Let's stick to Game Aggregate to maintain "Caps" consistency?
                // Wait, "Caps" usually means Games Played.
                // Let's calculate the AGGREGATE score for the Game.

                let teamAScore = 0;
                let teamBScore = 0;
                let validMatchFound = false;

                if (game.matches && game.matches.length > 0) {
                    game.matches.forEach((m: any) => {
                        if (m.status !== 'completed') return;
                        validMatchFound = true;
                        // Assuming Home/Away maps to A/B or dynamic names
                        // Logic from profile:
                        // if m.home_team == 'Team A' -> teamAScore += home_score
                        // But team names are dynamic.
                        // However, we only care about if the USER's team won.
                        // So let's skip calculating "Global Game Winner" and calculate "User Result" directly per booking?
                        // No, that's inefficient.
                        // Let's identify the scores of the TEAMS played.
                    });
                }

                // REVISED APPROACH: Iterate Bookings. For each booking, check THEIR matches.
                // This is O(Games * Players), which is fine.

                game.bookings.forEach((booking: any) => {
                    if (booking.status !== 'paid' && booking.status !== 'active') return;
                    // Only count active/paid players

                    const pid = booking.user_id;
                    if (!statsMap.has(pid)) return; // User might have been deleted?

                    const playerStats = statsMap.get(pid)!;
                    playerStats.matches_played += 1;

                    const myTeam = booking.team_assignment;
                    if (!myTeam || !game.matches) return;

                    let myGoals = 0;
                    let oppGoals = 0;
                    let played = false;

                    game.matches.forEach((m: any) => {
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

                    if (played) {
                        if (myGoals > oppGoals) {
                            playerStats.wins += 1;
                            playerStats.points += 3;
                        } else if (myGoals < oppGoals) {
                            playerStats.losses += 1;
                            // +0 pts
                        } else {
                            playerStats.draws += 1;
                            playerStats.points += 1;
                        }
                    }
                });
            });

            // 5. Final Calculations & Sort
            const processedPlayers = Array.from(statsMap.values()).map(p => ({
                ...p,
                win_percentage: p.matches_played > 0 ? (p.wins / p.matches_played) * 100 : 0
            }));

            // Sort: Points -> MVPs -> Win % -> Name
            processedPlayers.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.mvps !== a.mvps) return b.mvps - a.mvps;
                if (b.win_percentage !== a.win_percentage) return b.win_percentage - a.win_percentage;
                return a.full_name.localeCompare(b.full_name);
            });

            // Remove players with 0 games played? Or keep them at bottom?
            // "Standard table for all ranked players".
            // Let's keep everyone but maybe filter 0 games if list is too long later.
            // For now, keep everyone.

            setPlayers(processedPlayers);
            setLoading(false);
        };

        fetchData();
    }, [supabase]);

    if (loading) return <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    const top3 = players.slice(0, 3);
    const rest = players.slice(3);

    return (
        <div className="min-h-screen bg-pitch-black text-white p-6 pt-32 font-sans flex flex-col items-center">
            <div className="w-full max-w-4xl mb-24 flex justify-between items-center">
                <Link href="/" className="flex items-center text-pitch-secondary hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pitch
                </Link>
                <h1 className="font-heading text-4xl font-bold uppercase italic tracking-tighter">
                    Global <span className="text-pitch-accent">Leaderboard</span>
                </h1>
                <div className="w-20" /> {/* Spacer */}
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
                            <th className="p-4 text-center">Points</th>
                            <th className="p-4 text-center hidden md:table-cell">Record (W-D-L)</th>
                            <th className="p-4 text-center hidden md:table-cell">MVPs</th>
                            <th className="p-4 text-center md:hidden">Stat</th>
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
                                                {player.wins}-{player.draws}-{player.losses} • {player.mvps} MVPs
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-center font-black italic text-lg">{player.points}</td>
                                <td className="p-4 text-center font-mono text-sm hidden md:table-cell text-white/70">
                                    <span className="text-green-400">{player.wins}</span> -
                                    <span className="text-gray-400">{player.draws}</span> -
                                    <span className="text-red-400">{player.losses}</span>
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
                                <td className="p-4 text-center md:hidden">
                                    <div className="text-xs font-bold bg-white/10 rounded px-1 py-0.5 inline-block">
                                        {player.points} pts
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
                {players.length === 0 && (
                    <div className="p-8 text-center text-pitch-secondary italic">
                        No matches recorded yet. Be the first to play!
                    </div>
                )}
            </div>
        </div>
    );
}

function PodiumCard({ player, rank }: { player: PlayerStats, rank: number }) {
    let borderColor = "border-gray-400";
    let bgColor = "bg-gray-400";
    let height = "h-32 md:h-44"; // 3rd
    let order = "order-3 md:order-3"; // 3rd
    let numberColor = "text-gray-300";

    if (rank === 1) {
        borderColor = "border-yellow-400";
        bgColor = "bg-yellow-400";
        height = "h-40 md:h-60";
        order = "order-1 md:order-2"; // Center
        numberColor = "text-yellow-300";
    } else if (rank === 2) {
        borderColor = "border-gray-300";
        bgColor = "bg-gray-300"; // Silver
        height = "h-36 md:h-52";
        order = "order-2 md:order-1"; // Left
        numberColor = "text-gray-200";
    } else {
        // Bronze correction
        borderColor = "border-orange-400";
        bgColor = "bg-orange-400";
        numberColor = "text-orange-300";
    }

    return (
        <div className={cn("flex flex-col items-center justify-end flex-1 max-w-[200px]", order)}>
            {/* Avatar */}
            <div className="relative mb-4 group">
                {rank === 1 && (
                    <Crown className="w-8 h-8 text-yellow-400 absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce" />
                )}
                <div className={cn(
                    "w-16 h-16 md:w-32 md:h-32 rounded-full border-4 overflow-hidden shadow-2xl relative z-10",
                    borderColor
                )}>
                    {player.avatar_url ? (
                        <img src={player.avatar_url} alt={player.full_name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-black/50 flex items-center justify-center font-bold text-2xl text-white/50">
                            {player.full_name.charAt(0)}
                        </div>
                    )}
                </div>
                <div className={cn(
                    "absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-black shadow-lg z-20 whitespace-nowrap",
                    bgColor
                )}>
                    {player.points} PTS
                </div>
            </div>

            {/* Podium Block */}
            <div className={cn(
                "w-full rounded-t-lg bg-pitch-card border-x border-t border-white/10 flex flex-col items-center justify-start pt-8 pb-4 relative overflow-hidden",
                height
            )}>
                {/* Number */}
                <div className={cn("font-heading font-black text-6xl md:text-8xl opacity-20 absolute bottom-0 select-none", numberColor)}>
                    {rank}
                </div>

                <div className="text-center z-10 px-2 w-full">
                    <h3 className="font-bold text-xs md:text-lg leading-tight mb-1 truncate w-full px-1">{player.full_name}</h3>
                    <p className="text-[10px] md:text-xs text-pitch-secondary uppercase font-bold">
                        {player.wins}-{player.draws}-{player.losses}
                    </p>
                    {player.mvps > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full text-[10px] text-yellow-400 border border-yellow-400/20">
                            <Trophy className="w-2 h-2" /> {player.mvps}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
