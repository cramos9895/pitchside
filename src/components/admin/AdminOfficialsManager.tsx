'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { UserCheck, UserMinus, Clock, UserX, Loader2 } from 'lucide-react';
import { MatchRefereeAssigner } from './MatchRefereeAssigner';

interface AdminOfficialsManagerProps {
    gameId: string;
}

export function AdminOfficialsManager({ gameId }: AdminOfficialsManagerProps) {
    const [matches, setMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchOfficials = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('matches')
            .select(`
                id, 
                home_team, 
                away_team, 
                start_time, 
                scheduled_time, 
                match_officials(
                    id, 
                    role, 
                    status,
                    payout_method,
                    off_platform_name,
                    off_platform_email,
                    profiles(first_name, last_name, email)
                ),
                match_bids(
                    id,
                    role,
                    status,
                    bid_amount,
                    bid_type,
                    user_id,
                    profiles(first_name, last_name, email, reliability_rating, completed_assignments, missed_assignments)
                )
            `)
            .eq('game_id', gameId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMatches(data);
        } else {
            console.error('Error fetching officials:', error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchOfficials();
    }, [gameId]);

    const handleApprove = async (officialId: string, matchId: string, role: string) => {
        setProcessingId(officialId);
        try {
            // 1. Set this official to Confirmed
            const { error: confirmError } = await supabase
                .from('match_officials')
                .update({ status: 'Confirmed' })
                .eq('id', officialId);

            if (confirmError) throw confirmError;

            // 2. Auto-Waitlist: Set all other Pending officials for this match & role to Waitlist
            const { error: waitlistError } = await supabase
                .from('match_officials')
                .update({ status: 'Waitlist' })
                .eq('match_id', matchId)
                .eq('role', role)
                .eq('status', 'Pending')
                .neq('id', officialId);

            if (waitlistError) throw waitlistError;

            await fetchOfficials();
        } catch (err) {
            console.error('Error approving official:', err);
            alert('Failed to approve official.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRemove = async (officialId: string) => {
        setProcessingId(officialId);
        try {
            const { error } = await supabase
                .from('match_officials')
                .delete()
                .eq('id', officialId);

            if (error) throw error;
            await fetchOfficials();
        } catch (err) {
            console.error('Error removing official:', err);
            alert('Failed to remove official.');
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#cbff00]" />
            </div>
        );
    }

    if (matches.length === 0) {
        return (
            <div className="p-8 border border-white/10 bg-white/5 rounded-sm text-center">
                <p className="text-gray-500 font-medium">No matches found for this game.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {matches.map(match => (
                <MatchRefereeAssigner key={match.id} match={match} onRefresh={fetchOfficials} />
            ))}
        </div>
    );
}
