'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ChevronRight, MessageSquare, Star } from 'lucide-react';
import Link from 'next/link';

export function MatchReportClient({ match, events, refereeId }: { match: any, events: any[], refereeId: string }) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [localEvents, setLocalEvents] = useState(events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    
    // Report State
    const [conductRating, setConductRating] = useState<number>(5);
    const [facilityNotes, setFacilityNotes] = useState('');
    const [matchNotes, setMatchNotes] = useState('');

    const handleUpdateEvent = async (eventId: string, field: 'jersey_number' | 'incident_note', value: string) => {
        setLocalEvents(prev => prev.map(e => e.id === eventId ? { ...e, [field]: value } : e));
        
        try {
            await supabase.from('match_events').update({ [field]: value }).eq('id', eventId);
        } catch (e) {
            console.error('Failed to update event', e);
        }
    };

    const handleSubmitReport = async () => {
        if (!confirm('Submit official report? This will lock the match for Admin Review.')) return;
        setIsProcessing(true);
        try {
            // Insert match report
            const { error: reportError } = await supabase.from('match_reports').insert([{
                match_id: match.id,
                referee_id: refereeId,
                conduct_rating: conductRating,
                facility_notes: facilityNotes,
                match_notes: matchNotes
            }]);
            if (reportError) throw reportError;

            // Update match review status
            const { error: matchError } = await supabase.from('matches').update({ review_status: 'pending_review' }).eq('id', match.id);
            if (matchError) throw matchError;

            alert('Report submitted successfully!');
            router.push('/referee');
        } catch (e) {
            console.error('Failed to submit report', e);
            alert('Failed to submit report');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-pitch-black font-sans text-white pb-32">
            <header className="bg-black/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 p-4">
                <div className="flex items-center gap-4">
                    <Link href="/referee" className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </Link>
                    <div>
                        <h1 className="font-black italic uppercase tracking-widest text-xl">Post-Game Cleanup</h1>
                        <p className="text-xs text-gray-400 font-bold tracking-wider uppercase">Match ID: {match.id.substring(0,8)}</p>
                    </div>
                </div>
            </header>

            <main className="p-4 max-w-3xl mx-auto space-y-8 mt-4">
                <div className="bg-pitch-card p-6 rounded-sm border border-white/5">
                    <h2 className="text-2xl font-black italic uppercase text-[#cbff00] mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" /> Event Verification
                    </h2>
                    <p className="text-sm text-gray-400 mb-6 font-medium">
                        Please verify all logged events. Add incident notes to any yellow or red cards. Clean up any "Unknown" jersey numbers if possible.
                    </p>

                    <div className="space-y-4">
                        {localEvents.map(event => {
                            const isHome = event.team_id === match.home_team_id;
                            const teamName = isHome ? match.home_team_rel?.name : match.away_team_rel?.name;
                            const isCard = event.event_type.includes('card');

                            return (
                                <div key={event.id} className={`p-4 rounded-sm border ${isCard ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/10 bg-white/5'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded ${
                                                event.event_type === 'goal' ? 'bg-[#cbff00]/20 text-[#cbff00]' :
                                                event.event_type === 'yellow_card' ? 'bg-yellow-500/20 text-yellow-500' :
                                                'bg-red-500/20 text-red-500'
                                            }`}>
                                                {event.event_type.replace('_', ' ')}
                                            </span>
                                            <span className="font-bold text-sm text-gray-300">{teamName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 font-bold">Jersey:</span>
                                            <input 
                                                type="text" 
                                                value={event.jersey_number || ''}
                                                onChange={(e) => handleUpdateEvent(event.id, 'jersey_number', e.target.value)}
                                                placeholder="Unk"
                                                className="w-12 h-8 bg-black/50 border border-white/20 rounded text-center font-black text-[#cbff00] focus:border-[#cbff00] focus:outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Incident Note Input */}
                                    <div className="mt-2">
                                        <input 
                                            type="text"
                                            value={event.incident_note || ''}
                                            onChange={(e) => handleUpdateEvent(event.id, 'incident_note', e.target.value)}
                                            placeholder="Add incident context (required for Red Cards)..."
                                            className={`w-full bg-black/30 border rounded p-2 text-sm focus:outline-none transition-colors ${
                                                isCard && !event.incident_note ? 'border-orange-500/50 focus:border-orange-500 placeholder-orange-500/50 text-orange-200' : 'border-white/10 focus:border-[#cbff00] text-white'
                                            }`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {localEvents.length === 0 && (
                            <div className="text-center text-gray-500 font-bold uppercase py-4">No events logged.</div>
                        )}
                    </div>
                </div>

                <div className="bg-pitch-card p-6 rounded-sm border border-white/5 space-y-6">
                    <h2 className="text-2xl font-black italic uppercase text-white flex items-center gap-2 border-b border-white/10 pb-4">
                        <MessageSquare className="w-6 h-6" /> Official Match Report
                    </h2>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-3">Overall Player Conduct Rating</label>
                        <div className="flex gap-2">
                            {[1,2,3,4,5].map(star => (
                                <button 
                                    key={star}
                                    onClick={() => setConductRating(star)}
                                    className={`p-3 rounded transition-colors ${conductRating >= star ? 'bg-[#cbff00]/20 text-[#cbff00]' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                                >
                                    <Star className={`w-6 h-6 ${conductRating >= star ? 'fill-[#cbff00]' : ''}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Match Notes (Optional)</label>
                        <textarea 
                            value={matchNotes}
                            onChange={(e) => setMatchNotes(e.target.value)}
                            placeholder="Any notable match dynamics, delays, or general comments..."
                            className="w-full h-24 bg-black/40 border border-white/10 rounded p-3 text-sm focus:outline-none focus:border-[#cbff00] transition-colors resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Facility Notes (Optional)</label>
                        <textarea 
                            value={facilityNotes}
                            onChange={(e) => setFacilityNotes(e.target.value)}
                            placeholder="Field conditions, missing equipment, lighting issues..."
                            className="w-full h-24 bg-black/40 border border-white/10 rounded p-3 text-sm focus:outline-none focus:border-[#cbff00] transition-colors resize-none"
                        />
                    </div>

                    <button 
                        onClick={handleSubmitReport}
                        disabled={isProcessing}
                        className="w-full py-5 mt-4 rounded-sm font-black uppercase italic tracking-widest text-xl transition-transform active:scale-95 text-black"
                        style={{ backgroundImage: 'linear-gradient(to right, #cbff00, #a3cc00)' }}
                    >
                        {isProcessing ? 'Submitting...' : 'Submit Official Report'}
                    </button>
                </div>
            </main>
        </div>
    );
}
