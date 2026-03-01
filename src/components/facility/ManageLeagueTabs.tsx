'use client';

import { useState, useMemo } from 'react';
import { Trophy, Calendar, ClipboardList, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitMatchScore } from '@/app/actions/league-matches';
import { useFormStatus } from 'react-dom';

function SubmitScoreButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full mt-3 bg-pitch-accent hover:bg-white text-pitch-black font-bold uppercase tracking-wider py-2 rounded-sm text-xs transition-colors disabled:opacity-50"
        >
            {pending ? "Saving..." : "Lock Score"}
        </button>
    );
}

interface TeamData {
    id: string;
    name: string;
}

interface MatchData {
    id: string;
    league_id: string;
    home_team_id: string | null;
    away_team_id: string | null;
    home_team?: { name: string };
    away_team?: { name: string };
    home_score: number | null;
    away_score: number | null;
    status: string;
    week_number: number;
    start_time: string;
}

export function ManageLeagueTabs({ league, matches }: { league: any; matches: MatchData[] }) {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'results' | 'schedule'>('dashboard');
    const [selectedWeek, setSelectedWeek] = useState<number>(1);
    const [scoreError, setScoreError] = useState<string | null>(null);

    // Compute Standings
    const standings = useMemo(() => {
        const stats: Record<string, { gp: number, w: number, d: number, l: number, gf: number, ga: number, pts: number }> = {};

        // Initialize from attached teams
        league.teams?.forEach((t: any) => {
            stats[t.id] = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
        });

        // Compute from Completed Matches
        matches.filter(m => m.status === 'completed' && m.home_team_id && m.away_team_id).forEach(m => {
            if (!stats[m.home_team_id!]) stats[m.home_team_id!] = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
            if (!stats[m.away_team_id!]) stats[m.away_team_id!] = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };

            const home = stats[m.home_team_id!];
            const away = stats[m.away_team_id!];
            const hs = m.home_score || 0;
            const as = m.away_score || 0;

            home.gp++;
            away.gp++;
            home.gf += hs;
            home.ga += as;
            away.gf += as;
            away.ga += hs;

            if (hs > as) {
                home.w++;
                home.pts += 3;
                away.l++;
            } else if (as > hs) {
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
            .map(([id, data]) => {
                const team = league.teams?.find((t: any) => t.id === id);
                return {
                    id,
                    name: team?.name || 'Unknown',
                    ...data,
                    gd: data.gf - data.ga
                };
            })
            .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    }, [league, matches]);

    // Derived Scheduling
    const maxWeeks = useMemo(() => {
        if (matches.length === 0) return 1;
        return Math.max(...matches.map(m => m.week_number));
    }, [matches]);

    const weeksArray = Array.from({ length: maxWeeks }, (_, i) => i + 1);
    const matchesForSelectedWeek = matches.filter(m => m.week_number === selectedWeek);
    const upcomingGames = matches.filter(m => m.status !== 'completed').slice(0, 5);

    return (
        <div className="space-y-6">

            {/* Nav Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={cn("px-6 py-3 rounded-sm font-bold uppercase tracking-wider text-sm flex gap-2 items-center transition-all", activeTab === 'dashboard' ? "bg-pitch-accent text-pitch-black" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10")}
                >
                    <Trophy className="w-4 h-4" /> Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('results')}
                    className={cn("px-6 py-3 rounded-sm font-bold uppercase tracking-wider text-sm flex gap-2 items-center transition-all", activeTab === 'results' ? "bg-pitch-accent text-pitch-black" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10")}
                >
                    <ClipboardList className="w-4 h-4" /> Results Entry
                </button>
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={cn("px-6 py-3 rounded-sm font-bold uppercase tracking-wider text-sm flex gap-2 items-center transition-all", activeTab === 'schedule' ? "bg-pitch-accent text-pitch-black" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10")}
                >
                    <Calendar className="w-4 h-4" /> Full Schedule
                </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="animate-in fade-in duration-300">

                {/* 1. DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8">
                        {/* Leaderboard */}
                        <div className="w-full bg-pitch-card overflow-hidden rounded-sm border border-white/10">
                            <div className="p-5 border-b border-white/10 bg-black/40">
                                <h2 className="font-heading italic uppercase font-black text-xl text-white">League Standings</h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="text-xs text-gray-400 uppercase tracking-wider bg-white/5">
                                        <tr>
                                            <th className="px-5 py-3">Pos</th>
                                            <th className="px-5 py-3">Team</th>
                                            <th className="px-3 py-3 text-center">Played</th>
                                            <th className="px-3 py-3 text-center">W</th>
                                            <th className="px-3 py-3 text-center">D</th>
                                            <th className="px-3 py-3 text-center">L</th>
                                            <th className="px-3 py-3 text-center">GF</th>
                                            <th className="px-3 py-3 text-center">GA</th>
                                            <th className="px-3 py-3 text-center">GD</th>
                                            <th className="px-5 py-3 text-right bg-black/20 text-white font-bold">PTS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {standings.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="px-5 py-8 text-center text-gray-500 italic">No teams registered yet.</td>
                                            </tr>
                                        ) : (
                                            standings.map((team, idx) => (
                                                <tr key={team.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-5 py-4 font-black text-gray-500">{idx + 1}</td>
                                                    <td className="px-5 py-4 font-bold text-white">{team.name}</td>
                                                    <td className="px-3 py-4 text-center text-gray-400">{team.gp}</td>
                                                    <td className="px-3 py-4 text-center text-green-400">{team.w}</td>
                                                    <td className="px-3 py-4 text-center text-gray-400">{team.d}</td>
                                                    <td className="px-3 py-4 text-center text-red-400">{team.l}</td>
                                                    <td className="px-3 py-4 text-center text-gray-400">{team.gf}</td>
                                                    <td className="px-3 py-4 text-center text-gray-400">{team.ga}</td>
                                                    <td className="px-3 py-4 text-center text-gray-300 font-medium">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                                                    <td className="px-5 py-4 text-right bg-black/20 font-black text-pitch-accent text-lg">{team.pts}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bottom Panels */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gradient-to-br from-pitch-card to-white/5 border border-white/10 rounded-sm p-6">
                                <h3 className="font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Facility Overview</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-black/40 p-3 rounded">
                                        <span className="text-gray-400 text-sm">Teams Enrolled</span>
                                        <span className="text-white font-bold">{league.teams?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/40 p-3 rounded">
                                        <span className="text-gray-400 text-sm">Matches Scheduled</span>
                                        <span className="text-white font-bold">{matches.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/40 p-3 rounded">
                                        <span className="text-gray-400 text-sm">Matches Completed</span>
                                        <span className="text-green-400 font-bold">{matches.filter(m => m.status === 'completed').length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-pitch-card border border-white/10 rounded-sm p-6 overflow-hidden">
                                <h3 className="font-bold text-white flex items-center gap-2 uppercase tracking-wider mb-4">
                                    <Calendar className="w-4 h-4 text-pitch-accent" /> Upcoming Games
                                </h3>
                                <div className="space-y-3">
                                    {upcomingGames.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">No upcoming games scheduled.</p>
                                    ) : (
                                        upcomingGames.map(game => (
                                            <div key={game.id} className="bg-black/50 p-3 rounded border-l-2 border-pitch-accent">
                                                <div className="text-xs text-pitch-accent font-bold uppercase mb-1">Week {game.week_number}</div>
                                                <div className="flex justify-between items-center text-sm font-bold text-white">
                                                    <span>{game.home_team?.name || 'TBD'}</span>
                                                    <span className="text-gray-500 font-normal px-2">vs</span>
                                                    <span>{game.away_team?.name || 'TBD'}</span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-2">
                                                    {new Date(game.start_time).toLocaleDateString()} at {new Date(game.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. RESULTS ENTRY TAB */}
                {activeTab === 'results' && (
                    <div className="bg-pitch-card border border-white/10 rounded-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                        {/* Week Sidebar */}
                        <div className="md:w-64 bg-black/40 border-r border-white/10 flex flex-col p-4 space-y-2 overflow-y-auto">
                            <h3 className="font-bold uppercase text-gray-400 text-xs tracking-wider mb-2 px-2">Game Weeks</h3>
                            {weeksArray.length === 0 ? (
                                <p className="text-sm text-gray-500 px-2 italic">Generate schedule first.</p>
                            ) : (
                                weeksArray.map(w => (
                                    <button
                                        key={w}
                                        onClick={() => setSelectedWeek(w)}
                                        className={cn("text-left px-4 py-3 rounded-sm text-sm font-bold uppercase tracking-wider transition-all border-l-4", selectedWeek === w ? "bg-pitch-accent/10 text-pitch-accent border-pitch-accent" : "border-transparent text-gray-400 hover:bg-white/5 hover:text-white")}
                                    >
                                        Week {w}
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Match Forms */}
                        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-black/20">
                            <h3 className="text-2xl font-heading font-black italic uppercase text-white mb-6">Week {selectedWeek} Matchups</h3>

                            {scoreError && (
                                <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 font-bold p-4 rounded-sm text-sm">
                                    {scoreError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {matchesForSelectedWeek.length === 0 ? (
                                    <p className="text-gray-500 italic col-span-2">No matches generated for this week.</p>
                                ) : (
                                    matchesForSelectedWeek.map(match => {
                                        const isCompleted = match.status === 'completed';
                                        return (
                                            <div key={match.id} className="relative bg-black border border-white/10 rounded-lg p-5 flex flex-col shadow-xl">
                                                {isCompleted && (
                                                    <div className="absolute -top-3 -right-3 bg-green-500 text-black text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Locked
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-500 mb-4 font-bold uppercase tracking-wider text-center">
                                                    {new Date(match.start_time).toLocaleString()}
                                                </div>

                                                <form action={async (formData) => {
                                                    const res = await submitMatchScore(match.id, match.league_id, formData);
                                                    if (res?.error) setScoreError(res.error);
                                                    else setScoreError(null);
                                                }} className="flex flex-col h-full justify-between gap-4">

                                                    {/* Score Input Grid */}
                                                    <div className="flex items-center justify-between gap-4 w-full">
                                                        {/* Home */}
                                                        <div className="flex flex-col items-center flex-1 space-y-2">
                                                            <span className="font-bold text-white text-sm text-center line-clamp-2 min-h-10">
                                                                {match.home_team?.name || 'TBD (Home)'}
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="home_score"
                                                                min="0"
                                                                defaultValue={match.home_score !== null ? match.home_score : ''}
                                                                disabled={isCompleted}
                                                                placeholder="-"
                                                                className="w-16 h-16 text-center text-3xl font-numeric font-black bg-white/5 border border-white/20 rounded focus:border-pitch-accent focus:outline-none disabled:opacity-50 text-white"
                                                            />
                                                        </div>

                                                        {/* VS */}
                                                        <div className="text-gray-600 font-black italic">VS</div>

                                                        {/* Away */}
                                                        <div className="flex flex-col items-center flex-1 space-y-2">
                                                            <span className="font-bold text-white text-sm text-center line-clamp-2 min-h-10">
                                                                {match.away_team?.name || 'TBD (Away)'}
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="away_score"
                                                                min="0"
                                                                defaultValue={match.away_score !== null ? match.away_score : ''}
                                                                disabled={isCompleted}
                                                                placeholder="-"
                                                                className="w-16 h-16 text-center text-3xl font-numeric font-black bg-white/5 border border-white/20 rounded focus:border-pitch-accent focus:outline-none disabled:opacity-50 text-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    {!isCompleted && <SubmitScoreButton />}
                                                </form>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. SCHEDULE TAB */}
                {activeTab === 'schedule' && (
                    <div className="bg-pitch-card border border-white/10 rounded-sm p-2 sm:p-6 overflow-hidden">

                        <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                            <div>
                                <h2 className="font-heading italic uppercase font-black text-2xl text-white">Season Schedule</h2>
                                <p className="text-sm text-gray-400">All planned matchups for this league.</p>
                            </div>
                        </div>

                        {matches.length === 0 ? (
                            <div className="text-center py-20 bg-black/40 rounded border border-dashed border-white/20">
                                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">No Games Scheduled</h3>
                                <p className="text-gray-400">Facility Admins must generate a schedule for the league.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {weeksArray.map(w => {
                                    const weekMatches = matches.filter(m => m.week_number === w);
                                    if (weekMatches.length === 0) return null;

                                    return (
                                        <div key={`week-${w}`} className="space-y-4">
                                            <h3 className="font-bold uppercase tracking-widest text-pitch-accent border-b border-white/10 pb-2">
                                                Week {w}
                                            </h3>

                                            <div className="flex flex-col gap-2">
                                                {weekMatches.map(game => (
                                                    <div key={game.id} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center bg-black/40 hover:bg-black p-4 rounded border border-white/5">
                                                        <div className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 text-gray-500" />
                                                            {new Date(game.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="sm:col-span-2 flex justify-between items-center bg-white/5 px-4 py-2 rounded-full font-bold text-sm">
                                                            <span className={cn(game.status === 'completed' && game.home_score! > game.away_score! ? "text-green-400" : "text-white")}>
                                                                {game.home_team?.name || 'TBD'}
                                                            </span>
                                                            {game.status === 'completed' ? (
                                                                <span className="font-numeric text-lg text-pitch-accent px-4 bg-black rounded-full italic">
                                                                    {game.home_score} - {game.away_score}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-600 italic px-4 text-xs font-black uppercase tracking-wider">vs</span>
                                                            )}
                                                            <span className={cn(game.status === 'completed' && game.away_score! > game.home_score! ? "text-green-400" : "text-white")}>
                                                                {game.away_team?.name || 'TBD'}
                                                            </span>
                                                        </div>
                                                        <div className="text-right text-xs">
                                                            {game.status === 'completed' ? (
                                                                <span className="text-green-500 font-bold uppercase tracking-wider px-2 py-1 bg-green-500/10 rounded">Final</span>
                                                            ) : (
                                                                <span className="text-gray-500 font-bold uppercase tracking-wider px-2 py-1 bg-gray-500/10 rounded">Scheduled</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
