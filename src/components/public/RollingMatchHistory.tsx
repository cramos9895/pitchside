'use client';

import { useState } from 'react';
import { Calendar, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Match } from '@/components/admin/StandingsTable';

interface RollingMatchHistoryProps {
    matches: Match[];
    teams: any[];
    userTeamId?: string;
}

export function RollingMatchHistory({ matches, teams, userTeamId }: RollingMatchHistoryProps) {
    const [selectedDate, setSelectedDate] = useState<string>('');

    // Filter to completed matches
    const completedMatches = matches.filter(m => m.status === 'completed');

    if (completedMatches.length === 0) {
        return (
            <div className="bg-pitch-card border border-white/5 rounded-2xl overflow-hidden shadow-2xl p-8 text-center">
                <History className="w-12 h-12 text-pitch-secondary mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-black italic uppercase tracking-widest text-white mb-2">No Match History</h3>
                <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.2em] leading-relaxed max-w-md mx-auto">
                    No matches completed yet. Check back after Week 1!
                </p>
            </div>
        );
    }

    // Group matches by date
    const matchesByDate = completedMatches.reduce((acc, match) => {
        if (!match.start_time) return acc;
        // Group by calendar date string
        const dateObj = new Date(match.start_time);
        const dateKey = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(match);
        return acc;
    }, {} as Record<string, Match[]>);

    // Sort dates descending (newest first)
    const dates = Object.keys(matchesByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Auto-select latest date if none selected
    const activeDate = selectedDate || dates[0];
    const displayMatches = matchesByDate[activeDate] || [];

    const getTeamName = (teamId?: string) => {
        if (!teamId) return 'Unknown Team';
        // Match against the teams array provided in props
        const team = teams.find(t => t.id === teamId);
        return team?.name || 'Unknown Team';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-8 border-t border-white/5">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
                        <History className="w-6 h-6 text-pitch-accent" /> Match History
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-pitch-secondary">
                        Past results by match day
                    </p>
                </div>

                <div className="relative group/select">
                    <select
                        value={activeDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="appearance-none bg-[#1a1a1a] border border-white/10 text-white text-[10px] font-black uppercase tracking-widest pl-12 pr-10 py-4 rounded-sm focus:outline-none focus:border-pitch-accent transition-all cursor-pointer hover:bg-white/5"
                    >
                        {dates.map((date, idx) => (
                            <option key={date} value={date} className="bg-pitch-black text-white">
                                Match Day {dates.length - idx}: {date}
                            </option>
                        ))}
                    </select>
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-accent pointer-events-none" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 border-r-2 border-b-2 border-pitch-accent rotate-45 pointer-events-none" />
                </div>
            </div>

            <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                <div className="grid grid-cols-1 gap-3 min-w-[320px]">
                    {displayMatches.map((m) => {
                        const isUserTeamMatch = m.home_team_id === userTeamId || m.away_team_id === userTeamId;
                        const homeName = getTeamName(m.home_team_id);
                        const awayName = getTeamName(m.away_team_id);
                        
                        const homeScore = m.home_score || 0;
                        const awayScore = m.away_score || 0;
                        const isHomeWinner = homeScore > awayScore;
                        const isAwayWinner = awayScore > homeScore;
                        const isDraw = homeScore === awayScore;

                        return (
                            <div
                                key={m.id}
                                className={cn(
                                    "bg-pitch-card border transition-all duration-300 relative overflow-hidden",
                                    isUserTeamMatch 
                                        ? "border-pitch-accent/30 shadow-[0_0_30px_rgba(204,255,0,0.05)] bg-[#1a1a1a]" 
                                        : "border-white/5 hover:border-white/10 bg-pitch-card"
                                )}
                            >
                                {/* Visual Highlight for user's team match */}
                                {isUserTeamMatch && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-pitch-accent" />
                                )}

                                <div className="p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                    {/* Matchup Container */}
                                    <div className="flex-1 w-full grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8">
                                        {/* Home Team */}
                                        <div className="text-right flex flex-col items-end min-w-0">
                                            <span className={cn(
                                                "text-[10px] sm:text-xs md:text-sm font-black uppercase italic tracking-tighter truncate w-full",
                                                m.home_team_id === userTeamId ? "text-pitch-accent" : "text-white",
                                                (isHomeWinner || isDraw) ? "opacity-100" : "opacity-40"
                                            )}>
                                                {homeName}
                                            </span>
                                        </div>

                                        {/* Score Box */}
                                        <div className="bg-black/40 border border-white/5 rounded px-3 sm:px-4 md:px-6 py-2 flex items-center gap-2 sm:gap-3 md:gap-4 shadow-inner relative">
                                            <span className={cn(
                                                "text-lg sm:text-xl md:text-2xl font-black italic",
                                                isHomeWinner ? "text-pitch-accent" : isDraw ? "text-white" : "text-white/20"
                                            )}>
                                                {homeScore}
                                            </span>
                                            <span className="text-white/5 font-black text-[8px] sm:text-xs">VS</span>
                                            <span className={cn(
                                                "text-lg sm:text-xl md:text-2xl font-black italic",
                                                isAwayWinner ? "text-pitch-accent" : isDraw ? "text-white" : "text-white/20"
                                            )}>
                                                {awayScore}
                                            </span>
                                        </div>

                                        {/* Away Team */}
                                        <div className="text-left flex flex-col items-start min-w-0">
                                            <span className={cn(
                                                "text-[10px] sm:text-xs md:text-sm font-black uppercase italic tracking-tighter truncate w-full",
                                                m.away_team_id === userTeamId ? "text-pitch-accent" : "text-white",
                                                (isAwayWinner || isDraw) ? "opacity-100" : "opacity-40"
                                            )}>
                                                {awayName}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex items-center justify-center gap-4 sm:gap-6 md:border-l md:border-white/10 md:pl-8 shrink-0">
                                        {m.field_name && (
                                            <div className="flex flex-col items-center md:items-end">
                                                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-gray-500 mb-0.5">Arena Pitch</span>
                                                <span className="text-[10px] font-black uppercase text-white bg-white/5 px-2 py-0.5 border border-white/5 rounded-sm">
                                                    {m.field_name}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex flex-col items-center md:items-end">
                                            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-gray-500 mb-0.5">Final Whistle</span>
                                            <span className="text-[10px] font-black uppercase text-pitch-secondary">
                                                {m.start_time ? new Date(m.start_time).toLocaleTimeString('en-US', { 
                                                    hour: 'numeric', 
                                                    minute: '2-digit',
                                                    hour12: true 
                                                }) : 'TBD'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}
