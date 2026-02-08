
'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Match {
    id: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

interface TeamConfig {
    name: string;
    color: string;
}

interface StandingsTableProps {
    gameId: string;
    teams: TeamConfig[];
    matches: Match[];
}

export function StandingsTable({ gameId, teams, matches }: StandingsTableProps) {
    const [finalizing, setFinalizing] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const standings = useMemo(() => {
        const stats: Record<string, { gp: number, w: number, d: number, l: number, gf: number, ga: number, pts: number }> = {};

        // Initialize
        teams.forEach(t => {
            stats[t.name] = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
        });

        // Compute - ONLY for completed matches
        matches.filter(m => m.status === 'completed').forEach(m => {
            // Ensure teams exist in stats
            if (!stats[m.home_team]) stats[m.home_team] = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
            if (!stats[m.away_team]) stats[m.away_team] = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };

            const home = stats[m.home_team];
            const away = stats[m.away_team];

            home.gp++;
            away.gp++;
            home.gf += m.home_score;
            home.ga += m.away_score;
            away.gf += m.away_score;
            away.ga += m.home_score;

            if (m.home_score > m.away_score) {
                home.w++;
                home.pts += 3;
                away.l++;
            } else if (m.away_score > m.home_score) {
                away.w++;
                away.pts += 3;
                home.l++;
            } else {
                home.d++;
                home.pts += 1;
                away.d++;
                away.pts += 1;
            }
        });

        return Object.entries(stats)
            .map(([name, data]) => ({ name, ...data, gd: data.gf - data.ga }))
            // Sort by Points DESC, then GD DESC, then GF DESC
            .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    }, [matches, teams]);

    const handleFinalizeEvent = async (teamName: string) => {
        if (!confirm(`Declare ${teamName} as the Tournament Winner? \n(All players assigned to this team will get a Win)`)) return;

        setFinalizing(teamName);
        try {
            // 1. Reset all winners for this game
            await supabase.from('bookings').update({ is_winner: false }).eq('game_id', gameId);

            // 2. Set new winners
            const { error } = await supabase
                .from('bookings')
                .update({ is_winner: true })
                .eq('game_id', gameId)
                .eq('team_assignment', teamName);

            if (error) throw error;

            // 3. Update game status
            await supabase.from('games').update({ status: 'completed' }).eq('id', gameId);

            alert(`${teamName} Declared Winners!`);
            router.refresh();

        } catch (error: any) {
            alert("Error finalizing: " + error.message);
        } finally {
            setFinalizing(null);
            router.refresh();
            router.push('/admin');
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-sm p-6">
            <h2 className="font-heading text-xl font-bold italic uppercase flex items-center gap-2 mb-4 text-yellow-500">
                <Trophy className="w-5 h-5" /> Live Standings
            </h2>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-black/50 border-b border-white/10">
                        <tr>
                            <th className="px-4 py-3">Team</th>
                            <th className="px-4 py-3 text-center">GP</th>
                            <th className="px-4 py-3 text-center">W</th>
                            <th className="px-4 py-3 text-center">D</th>
                            <th className="px-4 py-3 text-center">L</th>
                            <th className="px-4 py-3 text-center text-gray-300">GD</th>
                            <th className="px-4 py-3 text-center font-bold text-white">PTS</th>
                            <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {standings.map((team, index) => {
                            const isLeader = index === 0 && team.gp > 0;
                            return (
                                <tr key={team.name} className={cn(
                                    "border-b border-white/5 transition-colors",
                                    isLeader ? "bg-yellow-500/10 hover:bg-yellow-500/20" : "hover:bg-white/5"
                                )}>
                                    <td className={cn("px-4 py-3 font-bold uppercase flex items-center gap-2", isLeader ? "text-yellow-400" : "text-white")}>
                                        <span className="font-mono text-gray-600 font-normal mr-1">{index + 1}.</span> {team.name}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-400">{team.gp}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs">{team.w}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs">{team.d}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs">{team.l}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs text-gray-300">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                                    <td className="px-4 py-3 text-center font-black text-lg">{team.pts}</td>
                                    <td className="px-4 py-3 text-right">
                                        {isLeader && (
                                            <button
                                                onClick={() => handleFinalizeEvent(team.name)}
                                                disabled={!!finalizing}
                                                className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold uppercase rounded hover:bg-white transition-colors flex items-center gap-2 ml-auto"
                                            >
                                                {finalizing === team.name ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trophy className="w-3 h-3" />}
                                                Crown
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="text-[10px] text-gray-600 mt-2 italic text-center">Sorted by Points, then Goal Difference.</p>
        </div>
    );
}
