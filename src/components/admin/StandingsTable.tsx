
'use client';

import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Match {
    id: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    group_name?: string;
}

interface TeamConfig {
    name: string;
    color: string;
}

interface StandingsTableProps {
    gameId: string;
    teams: TeamConfig[];
    matches: Match[];
    viewOnly?: boolean;
    teamsIntoPlayoffs?: number;
}

export function StandingsTable({ gameId, teams, matches, viewOnly = false, teamsIntoPlayoffs = 0 }: StandingsTableProps) {
    // 1. Determine Groups
    const groupStats = useMemo(() => {
        const groups: Record<string, any[]> = {};
        
        // Identify unique groups from matches
        const uniqueGroups = Array.from(new Set(matches.map(m => m.group_name || 'Group A'))).sort();
        
        uniqueGroups.forEach(groupName => {
            const groupMatches = matches.filter(m => (m.group_name || 'Group A') === groupName);
            const groupTeams = teams.filter(t => 
                groupMatches.some(m => m.home_team === t.name || m.away_team === t.name)
            );

            // Fallback for empty groups (if matches haven't been generated yet)
            if (groupTeams.length === 0 && uniqueGroups.length === 1) {
                groupTeams.push(...teams);
            }

            const stats: Record<string, { gp: number, w: number, d: number, l: number, gf: number, ga: number, pts: number }> = {};
            groupTeams.forEach(t => {
                stats[t.name] = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
            });

            groupMatches.filter(m => m.status === 'completed').forEach(m => {
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
                    home.w++; home.pts += 3; away.l++;
                } else if (m.away_score > m.home_score) {
                    away.w++; away.pts += 3; home.l++;
                } else {
                    home.d++; home.pts += 1; away.d++; away.pts += 1;
                }
            });

            groups[groupName] = Object.entries(stats)
                .map(([name, data]) => ({ name, ...data, gd: data.gf - data.ga }))
                .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
        });

        return groups;
    }, [matches, teams]);

    const groupNames = Object.keys(groupStats).sort();

    return (
        <div className="space-y-8">
            {groupNames.map((groupName) => (
                <div key={groupName} className="bg-gray-900 border border-gray-800 rounded-sm p-6">
                    <h2 className="font-heading text-xl font-bold italic uppercase flex items-center gap-2 mb-4 text-yellow-500">
                        <Trophy className="w-5 h-5" /> {groupName} Standings
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className={cn("uppercase bg-black/50 border-b border-white/10", viewOnly ? "text-[10px] text-gray-400" : "text-xs text-gray-400")}>
                                <tr>
                                    <th className={cn(viewOnly ? "px-2 py-1.5" : "px-4 py-3")}>Team</th>
                                    <th className={cn("text-center", viewOnly ? "px-2 py-1.5" : "px-4 py-3")}>GP</th>
                                    <th className={cn("text-center", viewOnly ? "px-2 py-1.5" : "px-4 py-3")}>W</th>
                                    <th className={cn("text-center", viewOnly ? "px-2 py-1.5" : "px-4 py-3")}>D</th>
                                    <th className={cn("text-center", viewOnly ? "px-2 py-1.5" : "px-4 py-3")}>L</th>
                                    <th className={cn("text-center text-gray-300", viewOnly ? "px-2 py-1.5" : "px-4 py-3")}>GD</th>
                                    <th className={cn("text-center font-bold text-white", viewOnly ? "px-2 py-1.5" : "px-4 py-3")}>PTS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupStats[groupName].map((team, index) => {
                                    // Logic for Master Ranking cutoff might be tricky here.
                                    // For now, let's just show 'Q' if they are in the top half of their group 
                                    // OR if we have a simple way to know the master ranking.
                                    // NOTE: The user's request for "Unified Master Ranking" was for SEEDING, 
                                    // but for DISPLAY they want separate tables.
                                    return (
                                        <tr key={team.name} className={cn(
                                            "border-b border-white/5 transition-colors relative hover:bg-white/5"
                                        )}>
                                            <td className={cn("font-bold uppercase flex items-center gap-2 text-white", viewOnly ? "px-2 py-1.5 text-xs lg:text-sm" : "px-4 py-3")}>
                                                <span className={cn("font-mono font-normal mr-1", viewOnly ? "text-[10px] text-gray-500" : "text-gray-600")}>{index + 1}.</span> {team.name}
                                            </td>
                                            <td className={cn("text-center text-gray-400", viewOnly ? "px-2 py-1.5 text-xs" : "px-4 py-3")}>{team.gp}</td>
                                            <td className={cn("text-center font-mono", viewOnly ? "px-2 py-1.5 text-[10px]" : "px-4 py-3 text-xs")}>{team.w}</td>
                                            <td className={cn("text-center font-mono", viewOnly ? "px-2 py-1.5 text-[10px]" : "px-4 py-3 text-xs")}>{team.d}</td>
                                            <td className={cn("text-center font-mono", viewOnly ? "px-2 py-1.5 text-[10px]" : "px-4 py-3 text-xs")}>{team.l}</td>
                                            <td className={cn("text-center font-mono text-gray-300", viewOnly ? "px-2 py-1.5 text-[10px]" : "px-4 py-3 text-xs")}>{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                                            <td className={cn("text-center font-black", viewOnly ? "px-2 py-1.5 text-base" : "px-4 py-3 text-lg")}>{team.pts}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
            <p className="text-[10px] text-gray-600 mt-2 italic text-center">Grouped by Pool. Top teams advance to Playoffs based on Unified Master Ranking.</p>
        </div>
    );
}
