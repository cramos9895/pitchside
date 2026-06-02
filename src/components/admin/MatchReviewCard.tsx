'use client';

import { useState } from 'react';
import { approveMatchReport } from '@/app/actions/match-reviews';
import { AlertTriangle, CheckCircle2, DollarSign, Star, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function MatchReviewCard({ match }: { match: any }) {
    const router = useRouter();
    const report = match.match_reports?.[0] || {};
    const basePay = match.games?.base_pay || 0;
    const paymentMethod = match.games?.payment_method || 'digital';
    
    const [finalPayout, setFinalPayout] = useState<number>(basePay);
    const [isProcessing, setIsProcessing] = useState(false);

    // Filter cards
    const cardEvents = match.match_events?.filter((e: any) => e.event_type.includes('card')) || [];

    const handleApprove = async () => {
        if (!confirm(`Are you sure you want to approve this match and trigger a final payout of $${finalPayout}?`)) return;
        
        setIsProcessing(true);
        try {
            await approveMatchReport(match.id, finalPayout);
            alert('Match Approved and Locked!');
            router.refresh();
        } catch (err: any) {
            console.error('Failed to approve', err);
            alert(err.message || 'Failed to approve match');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-[#000000] border border-white/20 p-8 flex flex-col gap-8 shadow-2xl relative overflow-hidden">
            {/* Header / Game Data */}
            <div className="flex justify-between items-start border-b border-white/10 pb-6">
                <div>
                    <h2 className="font-black italic uppercase text-2xl tracking-widest text-white">
                        {match.home_team_rel?.name || 'Home'} <span className="text-[#cbff00] mx-2">{match.home_score} - {match.away_score}</span> {match.away_team_rel?.name || 'Away'}
                    </h2>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">
                        Ref ID: {report.referee_id?.substring(0,8) || 'Unknown'} | Match: {match.id.substring(0,8)}
                    </p>
                </div>
                <div className="text-right">
                    <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-3 py-1 rounded-sm font-black uppercase tracking-widest text-xs">
                        Pending
                    </span>
                </div>
            </div>

            {/* Discipline Flags */}
            {cardEvents.length > 0 && (
                <div className="bg-[#111111] border border-red-500/30 p-4">
                    <h3 className="font-black italic text-red-500 uppercase flex items-center gap-2 mb-4 tracking-widest">
                        <AlertTriangle className="w-5 h-5" /> Discipline Flags
                    </h3>
                    <div className="space-y-3">
                        {cardEvents.map((event: any) => (
                            <div key={event.id} className="flex flex-col gap-1 border-l-2 border-red-500 pl-3">
                                <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${event.event_type === 'red_card' ? 'bg-red-500 text-black' : 'bg-yellow-500 text-black'}`}>
                                        {event.event_type.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs font-bold text-gray-300">
                                        Team ID: {event.team_id?.substring(0,6)} | Jersey: {event.jersey_number || 'Unk'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 italic">
                                    "{event.incident_note || 'No note provided'}"
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Report Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-black italic uppercase text-white tracking-widest flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5" /> Match Notes
                    </h3>
                    <p className="text-sm text-gray-400 bg-white/5 p-4 min-h-[100px] border border-white/10">
                        {report.match_notes || 'No notes provided by referee.'}
                    </p>
                </div>
                <div>
                    <h3 className="font-black italic uppercase text-white tracking-widest flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5" /> Facility Notes
                    </h3>
                    <p className="text-sm text-gray-400 bg-white/5 p-4 min-h-[100px] border border-white/10">
                        {report.facility_notes || 'No facility issues reported.'}
                    </p>
                </div>
            </div>

            {/* Financial Module & Master Lock */}
            <div className="bg-[#111111] p-6 border border-white/10 mt-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 w-full space-y-2">
                    <h3 className="font-black italic uppercase text-white tracking-widest flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[#cbff00]" /> Financial Override
                    </h3>
                    <div className="flex gap-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <span>Base: ${basePay}</span>
                        <span>|</span>
                        <span>Mode: {paymentMethod}</span>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <span className="text-2xl font-black italic text-white">$</span>
                        <input 
                            type="number"
                            value={finalPayout}
                            onChange={(e) => setFinalPayout(Number(e.target.value))}
                            className="bg-black border border-white/20 text-white font-black italic text-2xl w-32 px-3 py-2 focus:outline-none focus:border-[#cbff00] transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 w-full flex flex-col gap-3">
                    <div className="flex items-center justify-between px-2 text-sm">
                        <span className="font-bold uppercase tracking-widest text-gray-400">Conduct</span>
                        <div className="flex items-center gap-1 text-[#cbff00]">
                            {report.conduct_rating || 0} <Star className="w-4 h-4 fill-[#cbff00]" />
                        </div>
                    </div>
                    <button 
                        onClick={handleApprove}
                        disabled={isProcessing}
                        className="w-full py-5 font-black italic uppercase tracking-[0.2em] text-xl text-black transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundImage: 'linear-gradient(to right, #cbff00, #a3cc00)' }}
                    >
                        {isProcessing ? 'Locking...' : 'Approve & Lock'} <CheckCircle2 className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
