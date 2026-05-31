'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { UserCheck, UserMinus, Clock, UserX, Loader2 } from 'lucide-react';

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
                    profiles(first_name, last_name, email)
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
            {matches.map(match => {
                const officials = match.match_officials || [];
                const confirmed = officials.filter((o: any) => o.status === 'Confirmed');
                const pending = officials.filter((o: any) => o.status === 'Pending');
                const waitlist = officials.filter((o: any) => o.status === 'Waitlist');

                const timeStr = match.scheduled_time || match.start_time;
                const displayTime = timeStr ? new Date(timeStr).toLocaleString() : 'TBD';

                return (
                    <div key={match.id} className="border border-white/10 bg-black rounded-sm overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="font-black italic uppercase tracking-tight text-white text-lg">
                                    {match.home_team} vs {match.away_team}
                                </h3>
                                <p className="text-xs text-gray-400 font-medium">{displayTime}</p>
                            </div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                {officials.length} Applicants
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {officials.length === 0 ? (
                                <p className="text-gray-500 text-sm italic">No officials have applied yet.</p>
                            ) : (
                                <>
                                    {/* Confirmed */}
                                    {confirmed.length > 0 && (
                                        <div>
                                            <h4 className="text-[#cbff00] font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                                                <UserCheck className="w-4 h-4" /> Confirmed
                                            </h4>
                                            <div className="space-y-2">
                                                {confirmed.map((o: any) => (
                                                    <div key={o.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-sm">
                                                        <div>
                                                            <p className="text-white font-bold text-sm">{o.profiles?.first_name} {o.profiles?.last_name}</p>
                                                            <p className="text-gray-400 text-xs">{o.profiles?.email} • Role: {o.role}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRemove(o.id)}
                                                            disabled={processingId === o.id}
                                                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                                                            title="Remove Official"
                                                        >
                                                            {processingId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pending */}
                                    {pending.length > 0 && (
                                        <div>
                                            <h4 className="text-yellow-500 font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                                                <Clock className="w-4 h-4" /> Pending Applications
                                            </h4>
                                            <div className="space-y-2">
                                                {pending.map((o: any) => (
                                                    <div key={o.id} className="flex items-center justify-between p-3 bg-black border border-yellow-500/30 rounded-sm">
                                                        <div>
                                                            <p className="text-gray-200 font-bold text-sm">{o.profiles?.first_name} {o.profiles?.last_name}</p>
                                                            <p className="text-gray-500 text-xs">{o.profiles?.email} • Role: {o.role}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => handleApprove(o.id, match.id, o.role)}
                                                                disabled={processingId === o.id}
                                                                className="px-3 py-1.5 bg-[#cbff00] text-black font-black text-xs uppercase tracking-wider rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                {processingId === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRemove(o.id)}
                                                                disabled={processingId === o.id}
                                                                className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                                                                title="Reject Application"
                                                            >
                                                                <UserX className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Waitlist */}
                                    {waitlist.length > 0 && (
                                        <div>
                                            <h4 className="text-gray-500 font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                                                <UserMinus className="w-4 h-4" /> Waitlist
                                            </h4>
                                            <div className="space-y-2">
                                                {waitlist.map((o: any) => (
                                                    <div key={o.id} className="flex items-center justify-between p-3 bg-black border border-white/5 rounded-sm opacity-75">
                                                        <div>
                                                            <p className="text-gray-400 font-bold text-sm">{o.profiles?.first_name} {o.profiles?.last_name}</p>
                                                            <p className="text-gray-600 text-xs">{o.profiles?.email} • Role: {o.role}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => handleApprove(o.id, match.id, o.role)}
                                                                disabled={processingId === o.id}
                                                                className="px-3 py-1.5 border border-white/20 text-white font-black text-xs uppercase tracking-wider rounded-sm hover:bg-white hover:text-black transition-colors disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                {processingId === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Promote'}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRemove(o.id)}
                                                                disabled={processingId === o.id}
                                                                className="p-1.5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                                                                title="Remove from Waitlist"
                                                            >
                                                                <UserX className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
