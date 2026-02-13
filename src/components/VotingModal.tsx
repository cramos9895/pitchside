'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Trophy, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Candidate {
    id: string; // profile id
    full_name: string;
    email: string;
    team_assignment?: string;
}

interface VotingModalProps {
    gameId: string;
    candidates: Candidate[];
    onVoteSuccess: () => void;
    onClose: () => void;
}

export function VotingModal({ gameId, candidates, onVoteSuccess, onClose }: VotingModalProps) {
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleVote = async () => {
        if (!selectedCandidateId) return;
        setSubmitting(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error: insertError } = await supabase
                .from('mvp_votes')
                .insert({
                    game_id: gameId,
                    voter_id: user.id,
                    candidate_id: selectedCandidateId
                });

            if (insertError) {
                if (insertError.code === '23505') { // Unique constraint violation
                    throw new Error("You have already voted for this game.");
                }
                throw insertError;
            }

            onVoteSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to submit vote");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-pitch-card border border-white/10 p-6 rounded-sm max-w-md w-full shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-500 mb-3">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <h2 className="font-heading text-2xl font-bold italic uppercase">
                        Vote for <span className="text-pitch-accent">MVP</span>
                    </h2>
                    <p className="text-pitch-secondary text-sm mt-2">
                        Who was the most valuable player of the match?
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded mb-4 text-center">
                        {error}
                    </div>
                )}

                <div className="max-h-[300px] overflow-y-auto space-y-2 mb-6 pr-2">
                    {candidates.length === 0 ? (
                        <div className="text-center text-gray-500 italic py-4">No eligible candidates found.</div>
                    ) : (
                        candidates.map((candidate) => (
                            <button
                                key={candidate.id}
                                onClick={() => setSelectedCandidateId(candidate.id)}
                                className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-sm border transition-all",
                                    selectedCandidateId === candidate.id
                                        ? "bg-pitch-accent text-pitch-black border-pitch-accent font-bold"
                                        : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                        selectedCandidateId === candidate.id ? "bg-black/20" : "bg-white/10"
                                    )}>
                                        {candidate.full_name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span>{candidate.full_name}</span>
                                        {candidate.team_assignment && (
                                            <span className={cn(
                                                "text-[10px] uppercase",
                                                selectedCandidateId === candidate.id ? "text-black/60" : "text-gray-500"
                                            )}>
                                                Team {candidate.team_assignment}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {selectedCandidateId === candidate.id && <CheckCircle2 className="w-5 h-5" />}
                            </button>
                        ))
                    )}
                </div>

                <button
                    onClick={handleVote}
                    disabled={!selectedCandidateId || submitting}
                    className="w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Vote"}
                </button>
            </div>
        </div>
    );
}
