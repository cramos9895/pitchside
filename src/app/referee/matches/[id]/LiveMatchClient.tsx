'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ShieldAlert, Activity, CheckCircle2, ChevronLeft, Flag, Square, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function LiveMatchClient({ initialMatch }: { initialMatch: any }) {
    const router = useRouter();
    const [match, setMatch] = useState(initialMatch);
    const [isProcessing, setIsProcessing] = useState(false);

    const isScheduled = match.status === 'scheduled';
    const isInProgress = match.status === 'in_progress';
    const isFinalized = match.status === 'finalized';

    const handleStartMatch = async () => {
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('matches')
                .update({ status: 'in_progress' })
                .eq('id', match.id);
            if (error) throw error;
            setMatch({ ...match, status: 'in_progress' });
        } catch (e) {
            console.error('Failed to start match', e);
            alert('Failed to start match');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFinalizeMatch = async () => {
        if (!confirm('Are you sure you want to finalize this match? The score will be locked.')) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('matches')
                .update({ status: 'finalized', is_final: true })
                .eq('id', match.id);
            if (error) throw error;
            setMatch({ ...match, status: 'finalized', is_final: true });
        } catch (e) {
            console.error('Failed to finalize match', e);
            alert('Failed to finalize match');
        } finally {
            setIsProcessing(false);
        }
    };

    const logEvent = async (teamType: 'home' | 'away', teamId: string | null, eventType: string) => {
        if (!isInProgress) {
            alert('Match must be in progress to log events.');
            return;
        }

        setIsProcessing(true);
        try {
            // Log Event
            const { error: eventError } = await supabase
                .from('match_events')
                .insert({
                    match_id: match.id,
                    team_id: teamId,
                    event_type: eventType,
                });
            if (eventError) throw eventError;

            // If it's a goal, update the score natively
            if (eventType === 'goal') {
                const currentScore = teamType === 'home' ? match.home_score : match.away_score;
                const newScore = (currentScore || 0) + 1;
                
                const updateField = teamType === 'home' ? { home_score: newScore } : { away_score: newScore };
                const { error: scoreError } = await supabase
                    .from('matches')
                    .update(updateField)
                    .eq('id', match.id);
                    
                if (scoreError) throw scoreError;
                
                setMatch({ ...match, ...updateField });
            } else {
                // Just trigger a re-render/toast in a real app, for now we just finish processing
            }

        } catch (e) {
            console.error('Failed to log event', e);
            alert('Failed to log event');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pb-32">
            {/* Header */}
            <header className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black z-50">
                <Link href="/referee" className="flex items-center gap-2 text-gray-400 hover:text-white">
                    <ChevronLeft className="w-6 h-6" />
                    <span className="font-bold uppercase tracking-widest text-sm">Hub</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Activity className={`w-5 h-5 ${isInProgress ? 'text-[#cbff00] animate-pulse' : 'text-gray-600'}`} />
                    <span className="font-black italic uppercase tracking-widest text-xs">
                        {isScheduled && 'Scheduled'}
                        {isInProgress && 'Live'}
                        {isFinalized && 'Final'}
                    </span>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 space-y-8">
                {/* Scoreboard */}
                <section className="text-center space-y-4 pt-6">
                    <div className="flex justify-between items-center px-4">
                        <div className="flex-1">
                            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-gray-300 truncate px-2">{match.home_team}</h2>
                        </div>
                        <div className="px-4">
                            <span className="text-gray-600 font-bold uppercase text-xs tracking-widest">VS</span>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-gray-300 truncate px-2">{match.away_team}</h2>
                        </div>
                    </div>

                    <div className="flex justify-center items-center gap-6 md:gap-12 text-7xl md:text-9xl font-black italic tabular-nums tracking-tighter">
                        <div className="w-32 md:w-48 text-right text-white">
                            {match.home_score || 0}
                        </div>
                        <div className="text-gray-800">-</div>
                        <div className="w-32 md:w-48 text-left text-white">
                            {match.away_score || 0}
                        </div>
                    </div>
                </section>

                {/* Match State Controls */}
                <section className="px-4 pt-8">
                    {isScheduled && (
                        <button 
                            onClick={handleStartMatch}
                            disabled={isProcessing}
                            className="w-full py-6 bg-[#cbff00] text-black font-black uppercase italic tracking-widest text-2xl rounded-sm disabled:opacity-50 transition-opacity active:scale-95"
                        >
                            {isProcessing ? 'Starting...' : 'Start Match'}
                        </button>
                    )}

                    {isFinalized && (
                        <div className="w-full py-6 border-2 border-[#cbff00] text-[#cbff00] font-black uppercase italic tracking-widest text-2xl rounded-sm flex items-center justify-center gap-3">
                            <CheckCircle2 className="w-8 h-8" /> Match Finalized
                        </div>
                    )}
                </section>

                {/* Action Pad (Only if in progress) */}
                {isInProgress && (
                    <section className="px-2 pb-12 animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-2 gap-4">
                            
                            {/* HOME ACTIONS */}
                            <div className="space-y-4">
                                <div className="text-center font-bold uppercase tracking-widest text-gray-500 text-xs mb-2">Home Actions</div>
                                <button 
                                    onClick={() => logEvent('home', match.home_team_id, 'goal')}
                                    disabled={isProcessing}
                                    className="w-full h-32 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <span className="font-black uppercase tracking-widest text-sm">Goal</span>
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => logEvent('home', match.home_team_id, 'yellow_card')}
                                        disabled={isProcessing}
                                        className="h-24 bg-yellow-500/20 border-2 border-yellow-500/50 hover:bg-yellow-500/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <Square className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                        <span className="font-bold uppercase text-[10px] tracking-wider text-yellow-500">Yellow</span>
                                    </button>
                                    <button 
                                        onClick={() => logEvent('home', match.home_team_id, 'red_card')}
                                        disabled={isProcessing}
                                        className="h-24 bg-red-500/20 border-2 border-red-500/50 hover:bg-red-500/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <Square className="w-6 h-6 text-red-500 fill-red-500" />
                                        <span className="font-bold uppercase text-[10px] tracking-wider text-red-500">Red</span>
                                    </button>
                                </div>
                            </div>

                            {/* AWAY ACTIONS */}
                            <div className="space-y-4">
                                <div className="text-center font-bold uppercase tracking-widest text-gray-500 text-xs mb-2">Away Actions</div>
                                <button 
                                    onClick={() => logEvent('away', match.away_team_id, 'goal')}
                                    disabled={isProcessing}
                                    className="w-full h-32 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <span className="font-black uppercase tracking-widest text-sm">Goal</span>
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => logEvent('away', match.away_team_id, 'yellow_card')}
                                        disabled={isProcessing}
                                        className="h-24 bg-yellow-500/20 border-2 border-yellow-500/50 hover:bg-yellow-500/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <Square className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                        <span className="font-bold uppercase text-[10px] tracking-wider text-yellow-500">Yellow</span>
                                    </button>
                                    <button 
                                        onClick={() => logEvent('away', match.away_team_id, 'red_card')}
                                        disabled={isProcessing}
                                        className="h-24 bg-red-500/20 border-2 border-red-500/50 hover:bg-red-500/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <Square className="w-6 h-6 text-red-500 fill-red-500" />
                                        <span className="font-bold uppercase text-[10px] tracking-wider text-red-500">Red</span>
                                    </button>
                                </div>
                            </div>

                        </div>

                        <div className="mt-12 px-4">
                            <button 
                                onClick={handleFinalizeMatch}
                                disabled={isProcessing}
                                className="w-full py-5 rounded-sm font-black uppercase italic tracking-widest text-xl transition-transform active:scale-95 text-black"
                                style={{ backgroundImage: 'linear-gradient(to right, #cbff00, #a3cc00)' }}
                            >
                                {isProcessing ? 'Processing...' : 'Finalize Match'}
                            </button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
