'use client';

import { useState } from 'react';
import { Edit, Save, X, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

const TEXT_COLOR_MAP: Record<string, string> = {
    'Neon Orange': 'text-orange-500',
    'Neon Blue': 'text-cyan-400',
    'Neon Green': 'text-[#ccff00]',
    'White': 'text-white',
    'Black': 'text-gray-400',
    'Red': 'text-red-500',
    'Yellow': 'text-yellow-400',
    'Light Blue': 'text-blue-400',
    'Pink': 'text-pink-500',
    'Purple': 'text-purple-500',
    'Blue': 'text-blue-600',
    'Grey': 'text-gray-500'
};

interface Match {
    id: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    round_number: number;
    status: string;
}

interface TeamConfig {
    name: string;
    color: string;
}

interface MatchResultsLogProps {
    matches: Match[];
    teams: TeamConfig[];
    onUpdate: () => void;
}

export function MatchResultsLog({ matches, teams, onUpdate }: MatchResultsLogProps) {
    const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
    const [editScores, setEditScores] = useState<{ home: number, away: number }>({ home: 0, away: 0 });
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    // Filter to only completed matches and group by round
    const completedMatches = matches.filter(m => m.status === 'completed' && m.round_number > 0);
    
    if (completedMatches.length === 0) {
        return null; // Don't show if no completed matches exist yet
    }

    const matchesByRound = completedMatches.reduce((acc, match) => {
        const round = match.round_number;
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
    }, {} as Record<number, Match[]>);

    // Sort rounds ascending
    const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

    const startEdit = (match: Match) => {
        setEditingMatchId(match.id);
        setEditScores({ home: match.home_score || 0, away: match.away_score || 0 });
    };

    const cancelEdit = () => {
        setEditingMatchId(null);
    };

    const saveEdit = async (matchId: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'update', 
                    matchId: matchId, 
                    matchData: { 
                        home_score: editScores.home, 
                        away_score: editScores.away 
                    } 
                })
            });

            if (res.ok) {
                toast.success("Score updated successfully.");
                setEditingMatchId(null);
                onUpdate(); // Trigger parent refresh (recalculate Standings)
            } else {
                toast.error("Failed to update score.");
            }
        } catch (error: any) {
             toast.error(error.message || "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-sm p-6 mt-6">
            <h2 className="font-heading text-xl font-bold italic uppercase flex items-center gap-2 mb-6">
                <CheckCircle2 className="w-5 h-5 text-pitch-accent" /> Tournament Results
            </h2>

            <div className="space-y-6">
                {rounds.map(roundNum => (
                    <div key={roundNum} className="border border-white/5 rounded overflow-hidden">
                        <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                                {roundNum === 100 ? 'Final Round' : `Round ${roundNum}`}
                            </span>
                        </div>
                        
                        <div className="divide-y divide-white/5">
                            {matchesByRound[roundNum].map(match => {
                                const isEditing = editingMatchId === match.id;
                                return (
                                    <div key={match.id} className="p-4 flex items-center justify-between bg-black/20 hover:bg-black/40 transition-colors">
                                        
                                        {/* Score Display / Edit Mode */}
                                        {isEditing ? (
                                            <div className="flex-1 flex items-center justify-center gap-4">
                                                <div className="flex-1 text-right text-sm font-bold uppercase text-white">{match.home_team}</div>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        value={editScores.home}
                                                        onChange={(e) => setEditScores({...editScores, home: Number(e.target.value)})}
                                                        className="w-12 bg-black border border-pitch-accent/50 text-center py-1 rounded text-white font-mono"
                                                    />
                                                    <span className="text-gray-500 font-bold">:</span>
                                                    <input 
                                                        type="number" 
                                                        value={editScores.away}
                                                        onChange={(e) => setEditScores({...editScores, away: Number(e.target.value)})}
                                                        className="w-12 bg-black border border-pitch-accent/50 text-center py-1 rounded text-white font-mono"
                                                    />
                                                </div>
                                                <div className="flex-1 text-left text-sm font-bold uppercase text-white">{match.away_team}</div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center gap-4 text-sm">
                                                <div className={cn("flex-1 text-right font-bold uppercase", match.home_score > match.away_score ? 'text-pitch-accent' : 'text-gray-400')}>
                                                    {match.home_team}
                                                </div>
                                                <div className="font-mono text-lg font-black bg-white/5 px-4 py-1 rounded border border-white/5 flex gap-2 w-24 justify-center">
                                                    <span className={match.home_score > match.away_score ? 'text-pitch-accent' : 'text-gray-500'}>{match.home_score}</span>
                                                    <span className="text-gray-700">-</span>
                                                    <span className={match.away_score > match.home_score ? 'text-pitch-accent' : 'text-gray-500'}>{match.away_score}</span>
                                                </div>
                                                <div className={cn("flex-1 text-left font-bold uppercase", match.away_score > match.home_score ? 'text-pitch-accent' : 'text-gray-400')}>
                                                    {match.away_team}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="ml-4 shrink-0 flex items-center gap-2">
                                            {isEditing ? (
                                                <>
                                                    <button 
                                                        onClick={() => saveEdit(match.id)}
                                                        disabled={loading}
                                                        className="p-2 bg-green-900/40 text-green-500 hover:bg-green-500 hover:text-black rounded transition-colors disabled:opacity-50"
                                                        title="Save Score"
                                                    >
                                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    </button>
                                                    <button 
                                                        onClick={cancelEdit}
                                                        className="p-2 bg-red-900/40 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => startEdit(match)}
                                                    className="p-2 text-gray-500 hover:text-pitch-accent hover:bg-pitch-accent/10 rounded transition-colors"
                                                    title="Edit Score"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
