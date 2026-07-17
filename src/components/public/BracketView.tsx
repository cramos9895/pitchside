import React from 'react';

import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface BracketViewProps {
    matches: any[];
}

export function BracketView({ matches }: BracketViewProps) {
    // Single Elimination typically groups matches by rounds.
    // For a flowchart UI, we can determine the rounds by tracing backwards from the Championship game.
    // However, a simple approach is to just render the matches grouped by `round_number` or sequence.
    // Since our generator doesn't set `round_number`, we can infer it or just show them in a list grouped by "Match X".
    
    // For a true bracket flowchart, we'll try to build a tree.
    // A match is a root (Championship) if its group_name (e.g., "Match 3") is never referenced as a winner in another match.
    
    const findRoots = () => {
        const referencedNames = new Set<string>();
        matches.forEach(m => {
            if (m.home_team && m.home_team.startsWith('Winner Match ')) {
                referencedNames.add(m.home_team.replace('Winner ', ''));
            }
            if (m.away_team && m.away_team.startsWith('Winner Match ')) {
                referencedNames.add(m.away_team.replace('Winner ', ''));
            }
        });

        return matches.filter(m => m.group_name && !referencedNames.has(m.group_name));
    };

    const roots = findRoots();

    const renderMatchNode = (match: any, depth: number = 0) => {
        // Find children
        const homeSourceMatch = matches.find(m => `Winner ${m.group_name}` === match.home_team);
        const awaySourceMatch = matches.find(m => `Winner ${m.group_name}` === match.away_team);

        return (
            <div key={match.id} className="flex items-center gap-8 relative my-4">
                {/* Children nodes (Previous Rounds) */}
                {(homeSourceMatch || awaySourceMatch) && (
                    <div className="flex flex-col justify-center gap-8 relative">
                        {homeSourceMatch && renderMatchNode(homeSourceMatch, depth + 1)}
                        {awaySourceMatch && renderMatchNode(awaySourceMatch, depth + 1)}
                        
                        {/* Connecting Lines */}
                        <div className="absolute right-[-2rem] top-[25%] bottom-[25%] w-px bg-pitch-accent/30" />
                        <div className="absolute right-[-2rem] top-[25%] w-8 h-px bg-pitch-accent/30" />
                        <div className="absolute right-[-2rem] bottom-[25%] w-8 h-px bg-pitch-accent/30" />
                    </div>
                )}

                {/* Current Node */}
                <div className="relative">
                    {(homeSourceMatch || awaySourceMatch) && (
                        <div className="absolute left-[-2rem] top-1/2 w-8 h-px bg-pitch-accent/30" />
                    )}
                    
                    <div className={cn(
                        "bg-pitch-card border border-white/10 rounded-lg p-3 min-w-[200px] shadow-xl relative z-10",
                        match.status === 'completed' && "border-pitch-accent/30 bg-pitch-accent/5"
                    )}>
                        {depth === 0 && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pitch-accent text-black text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_15px_rgba(204,255,0,0.5)] whitespace-nowrap">
                                <Trophy className="w-3 h-3" /> Championship
                            </div>
                        )}
                        <div className="text-[9px] font-black uppercase text-gray-500 mb-2 flex justify-between items-center">
                            <span>{match.group_name || 'Match'}</span>
                            {match.start_time && (
                                <span className="text-white/40">{new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between items-center bg-black/40 px-2 py-1.5 rounded text-sm">
                                <span className={cn("font-bold uppercase truncate max-w-[120px]", match.home_score > match.away_score && "text-pitch-accent")}>
                                    {match.home_team || 'TBD'}
                                </span>
                                {match.status === 'completed' && <span className="font-black text-white">{match.home_score}</span>}
                            </div>
                            <div className="flex justify-between items-center bg-black/40 px-2 py-1.5 rounded text-sm">
                                <span className={cn("font-bold uppercase truncate max-w-[120px]", match.away_score > match.home_score && "text-pitch-accent")}>
                                    {match.away_team || 'TBD'}
                                </span>
                                {match.status === 'completed' && <span className="font-black text-white">{match.away_score}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (roots.length === 0 && matches.length > 0) {
        // Fallback if no tree structure found
        return (
            <div className="space-y-4">
                {matches.map(m => (
                    <div key={m.id} className="bg-white/5 p-4 rounded-lg">{m.home_team} vs {m.away_team}</div>
                ))}
            </div>
        );
    }

    if (matches.length === 0) {
        return <div className="text-center p-8 text-white/50 font-bold uppercase tracking-widest text-sm">Bracket pending generation.</div>;
    }

    return (
        <div className="w-full overflow-x-auto hide-scrollbar py-12 px-6">
            <div className="min-w-max flex justify-end">
                {/* Render from right (Finals) to left (Round 1) */}
                {roots.map(root => (
                    <div key={root.id} className="flex items-center">
                        {renderMatchNode(root, 0)}
                    </div>
                ))}
            </div>
        </div>
    );
}
