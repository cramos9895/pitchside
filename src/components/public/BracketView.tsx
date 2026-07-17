import React from 'react';

import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface BracketViewProps {
    matches: any[];
}

export function BracketView({ matches }: BracketViewProps) {
    if (matches.length === 0) {
        return <div className="text-center p-8 text-white/50 font-bold uppercase tracking-widest text-sm">Bracket pending generation.</div>;
    }

    // Determine rounds based on "Winner Match X" dependencies
    const determineRounds = () => {
        // Find roots (matches that no other match depends on)
        const referencedNames = new Set<string>();
        matches.forEach(m => {
            if (m.home_team?.startsWith('Winner Match ')) referencedNames.add(m.home_team.replace('Winner ', ''));
            if (m.away_team?.startsWith('Winner Match ')) referencedNames.add(m.away_team.replace('Winner ', ''));
        });

        const roots = matches.filter(m => m.group_name && !referencedNames.has(m.group_name));

        if (roots.length === 0) return []; // Fallback

        const roundsMap = new Map<number, any[]>();
        
        const traverse = (match: any, depth: number) => {
            if (!roundsMap.has(depth)) roundsMap.set(depth, []);
            roundsMap.get(depth)!.push(match);

            const homeChild = matches.find(m => `Winner ${m.group_name}` === match.home_team);
            const awayChild = matches.find(m => `Winner ${m.group_name}` === match.away_team);

            if (homeChild) traverse(homeChild, depth + 1);
            if (awayChild) traverse(awayChild, depth + 1);
        };

        roots.forEach(r => traverse(r, 0));

        // Convert map to array of rounds, ordered from deepest (Quarterfinals) to 0 (Finals)
        const maxDepth = Math.max(...Array.from(roundsMap.keys()));
        const roundsList: any[][] = [];
        for (let i = maxDepth; i >= 0; i--) {
            if (roundsMap.has(i)) {
                roundsList.push(roundsMap.get(i)!);
            }
        }
        return roundsList;
    };

    const rounds = determineRounds();

    if (rounds.length === 0) {
        // Fallback for linear display
        return (
            <div className="space-y-4">
                {matches.map(m => (
                    <div key={m.id} className="bg-white/5 p-4 rounded-lg text-sm font-bold uppercase">
                        <span className="text-pitch-accent">{m.group_name || 'Match'}</span>: {m.home_team || 'TBD'} vs {m.away_team || 'TBD'}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto hide-scrollbar py-12 px-6">
            <div className="flex min-w-max items-stretch gap-12 lg:gap-24 relative">
                {rounds.map((roundMatches, roundIdx) => {
                    const isFinalRound = roundIdx === rounds.length - 1;
                    return (
                        <div key={`round-${roundIdx}`} className="flex flex-col justify-around gap-6 relative z-10">
                            {roundMatches.map((match, matchIdx) => (
                                <div key={match.id} className="relative flex items-center">
                                    <div className={cn(
                                        "bg-pitch-card border border-white/10 rounded-xl p-4 w-[240px] shadow-2xl relative z-10 transition-all",
                                        match.status === 'completed' && "border-pitch-accent/30 bg-pitch-accent/5",
                                        "hover:border-pitch-accent/50"
                                    )}>
                                        {isFinalRound && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pitch-accent text-black text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(204,255,0,0.5)] whitespace-nowrap">
                                                <Trophy className="w-3 h-3" /> Championship
                                            </div>
                                        )}
                                        
                                        <div className="text-[10px] font-black uppercase text-gray-500 mb-3 flex justify-between items-center border-b border-white/5 pb-2">
                                            <span>{match.group_name || `Match`}</span>
                                            {match.start_time && (
                                                <span className="text-white/40">{new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-1.5 relative">
                                            <div className="flex justify-between items-center bg-black/60 px-3 py-2 rounded-lg text-sm border border-white/5">
                                                <span className={cn("font-bold uppercase truncate max-w-[140px]", match.home_score > match.away_score && "text-pitch-accent")}>
                                                    {match.home_team || 'TBD'}
                                                </span>
                                                {match.status === 'completed' && <span className="font-black text-white">{match.home_score}</span>}
                                            </div>
                                            <div className="flex justify-between items-center bg-black/60 px-3 py-2 rounded-lg text-sm border border-white/5">
                                                <span className={cn("font-bold uppercase truncate max-w-[140px]", match.away_score > match.home_score && "text-pitch-accent")}>
                                                    {match.away_team || 'TBD'}
                                                </span>
                                                {match.status === 'completed' && <span className="font-black text-white">{match.away_score}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Connection Line to Next Round (Right) */}
                                    {!isFinalRound && (
                                        <div className="absolute left-full top-1/2 w-6 lg:w-12 h-px bg-white/20 -z-10" />
                                    )}
                                    {/* Vertical Connectors */}
                                    {!isFinalRound && matchIdx % 2 === 0 && (
                                        <div className="absolute left-[calc(100%+1.5rem)] lg:left-[calc(100%+3rem)] top-1/2 w-px h-[calc(50%+1.5rem)] bg-white/20 -z-10" />
                                    )}
                                    {!isFinalRound && matchIdx % 2 !== 0 && (
                                        <div className="absolute left-[calc(100%+1.5rem)] lg:left-[calc(100%+3rem)] bottom-1/2 w-px h-[calc(50%+1.5rem)] bg-white/20 -z-10" />
                                    )}
                                    
                                    {/* Connection Line from Previous Round (Left) */}
                                    {roundIdx > 0 && (
                                        <div className="absolute right-full top-1/2 w-6 lg:w-12 h-px bg-white/20 -z-10" />
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
