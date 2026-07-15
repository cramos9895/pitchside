'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { UserCheck, Clock, UserX, Loader2, AlertTriangle, UserPlus, Calendar, CheckCircle2, X, ChevronDown, ChevronUp, Phone, Mail } from 'lucide-react';
import { sendRefereeInvite } from '@/app/actions/send-referee-invite';
import { getRefereeSchedules } from '@/app/actions/referee-schedule';

export function MatchRefereeAssigner({ match, onRefresh }: { match: any, onRefresh: () => void }) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isAddingManual, setIsAddingManual] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualEmail, setManualEmail] = useState('');
    const [manualRole, setManualRole] = useState('Primary');

    const [schedules, setSchedules] = useState<Record<string, any[]>>({});
    const [selectedRefId, setSelectedRefId] = useState<string | null>(null);
    const [showRejected, setShowRejected] = useState(false);

    const officials = match.match_officials || [];
    const bids = match.match_bids || [];

    const confirmed = officials.filter((o: any) => o.status === 'Confirmed');
    
    // We filter bids that are still Pending
    const pendingBids = bids.filter((b: any) => b.status === 'Pending');
    const rejectedBids = bids.filter((b: any) => b.status === 'Rejected' || b.status === 'Countered');

    const pendingUserIds = JSON.stringify([...new Set(pendingBids.map((b:any) => b.user_id))]);

    const timeStr = match.scheduled_time || match.start_time;
    const matchDate = timeStr ? new Date(timeStr) : new Date();
    const displayTime = timeStr ? matchDate.toLocaleString() : 'TBD';

    useEffect(() => {
        const fetchSchedules = async () => {
            const userIds = JSON.parse(pendingUserIds);
            if (userIds.length === 0) return;
            const scheds = await getRefereeSchedules(userIds);
            
            const matchDateString = matchDate.toLocaleDateString();
            
            const grouped: Record<string, any[]> = {};
            scheds.forEach((s: any) => {
                const sDate = new Date(s.matches?.start_time || s.matches?.scheduled_time);
                if (sDate.toLocaleDateString() === matchDateString) {
                    if (!grouped[s.user_id]) grouped[s.user_id] = [];
                    grouped[s.user_id].push(s);
                }
            });
            setSchedules(grouped);
        };
        fetchSchedules();
    }, [pendingUserIds]);

    const checkConflict = (userId: string) => {
        const userSched = schedules[userId] || [];
        const matchTime = matchDate.getTime();
        for (const s of userSched) {
            const sTime = new Date(s.matches?.start_time || s.matches?.scheduled_time).getTime();
            const diff = Math.abs(matchTime - sTime);
            if (diff < 3600000) return true; // Less than 60 mins diff
        }
        return false;
    };

    const handleAcceptBid = async (bid: any) => {
        setProcessingId(bid.id);
        try {
            const { error: officialError } = await supabase.from('match_officials').insert({
                match_id: match.id,
                user_id: bid.user_id,
                role: bid.role,
                status: 'Confirmed',
                agreed_rate: bid.bid_amount,
                payout_method: 'Stripe'
            });
            if (officialError) throw officialError;

            await supabase.from('match_bids').update({ status: 'Accepted' }).eq('id', bid.id);
            await supabase.from('match_bids').update({ status: 'Rejected' }).eq('match_id', match.id).eq('role', bid.role).eq('status', 'Pending');

            onRefresh();
        } catch (err) {
            console.error('Error accepting bid:', err);
            alert('Failed to accept bid.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectBid = async (bidId: string) => {
        setProcessingId(bidId);
        try {
            await supabase.from('match_bids').update({ status: 'Rejected' }).eq('id', bidId);
            onRefresh();
        } catch (e) {
            console.error(e);
        } finally {
            setProcessingId(null);
        }
    };

    const handleCounterAsBackup = async (bid: any) => {
        if (!confirm(`Counter offer ${bid.profiles?.first_name} as a Backup referee? They will receive an invite to accept.`)) return;
        setProcessingId(bid.id);
        try {
            const backupRate = match.games?.backup_retainer_amount || 0;
            await supabase.from('match_bids').update({ status: 'Countered' }).eq('id', bid.id);
            await supabase.from('match_officials').insert({
                match_id: match.id,
                user_id: bid.user_id,
                role: 'Backup',
                status: 'Pending',
                agreed_rate: backupRate,
                payout_method: 'Stripe'
            });
            onRefresh();
        } catch(e) {
            console.error(e);
            alert('Failed to counter offer.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRemoveOfficial = async (officialId: string) => {
        setProcessingId(officialId);
        try {
            await supabase.from('match_officials').delete().eq('id', officialId);
            onRefresh();
        } catch (err) {
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    const handleAddManual = async () => {
        if (!manualName || !manualEmail) {
            alert('Name and Email are required for off-platform refs to send invites.');
            return;
        }
        setProcessingId('manual');
        try {
            const { error } = await supabase.from('match_officials').insert({
                match_id: match.id,
                role: manualRole,
                status: 'Confirmed',
                off_platform_name: manualName,
                off_platform_email: manualEmail,
                payout_method: 'Manual'
            });
            if (error) throw error;
            
            await sendRefereeInvite(manualEmail, `${match.home_team} vs ${match.away_team} - ${displayTime}`);

            setIsAddingManual(false);
            setManualName('');
            setManualEmail('');
            onRefresh();
        } catch (err) {
            console.error(err);
            alert('Failed to add manual official.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleBackupHandoff = async () => {
        const primary = confirmed.find((o: any) => o.role === 'Primary');
        const backup = confirmed.find((o: any) => o.role === 'Backup');
        
        if (!primary || !backup) {
            alert('Need both a confirmed Primary and Backup to execute a handoff.');
            return;
        }

        if (!confirm('Are you sure you want to handoff this match to the Backup referee? The Primary will be penalized.')) return;

        setProcessingId('handoff');
        try {
            if (primary.user_id) {
                const { data: profile } = await supabase.from('profiles').select('missed_assignments').eq('id', primary.user_id).single();
                if (profile) {
                    await supabase.from('profiles').update({ missed_assignments: profile.missed_assignments + 1 }).eq('id', primary.user_id);
                }
            }
            await supabase.from('match_officials').delete().eq('id', primary.id);
            const newRate = (match.games?.base_pay || 0) + (match.games?.backup_bonus_amount || 0);
            await supabase.from('match_officials').update({ role: 'Primary', agreed_rate: newRate }).eq('id', backup.id);
            alert('Backup Handoff Complete!');
            onRefresh();
        } catch (err) {
            console.error(err);
            alert('Failed to execute handoff.');
        } finally {
            setProcessingId(null);
        }
    };

    const hasPrimary = confirmed.some((o: any) => o.role === 'Primary');
    const hasBackup = confirmed.some((o: any) => o.role === 'Backup');
    const selectedRefProfile = selectedRefId ? bids.find((b:any) => b.user_id === selectedRefId)?.profiles : null;
    const selectedRefSchedule = selectedRefId ? schedules[selectedRefId] || [] : [];

    return (
        <div className="border border-white/10 bg-black rounded-sm overflow-hidden mb-6 relative">
            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <div>
                    <h3 className="font-black italic uppercase tracking-tight text-white text-lg">
                        {match.home_team} vs {match.away_team}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">{displayTime}</p>
                </div>
                <button 
                    onClick={() => setIsAddingManual(!isAddingManual)}
                    className="text-xs font-bold text-[#cbff00] uppercase tracking-widest flex items-center gap-1 hover:text-white"
                >
                    <UserPlus className="w-4 h-4"/> Add Direct / Off-Platform
                </button>
            </div>

            <div className="p-6 space-y-6">
                {isAddingManual && (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-sm mb-6 space-y-4">
                        <h4 className="text-white font-black uppercase text-xs tracking-widest">Assign Off-Platform Referee</h4>
                        <div className="flex gap-4">
                            <input placeholder="Full Name" value={manualName} onChange={e => setManualName(e.target.value)} className="bg-black border border-white/20 p-2 text-white rounded-sm w-full outline-none focus:border-[#cbff00] text-sm"/>
                            <input placeholder="Email (Required for Invite)" type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} className="bg-black border border-white/20 p-2 text-white rounded-sm w-full outline-none focus:border-[#cbff00] text-sm"/>
                            <select value={manualRole} onChange={e => setManualRole(e.target.value)} className="bg-black border border-white/20 p-2 text-white rounded-sm outline-none text-sm">
                                <option>Primary</option>
                                <option>Backup</option>
                            </select>
                        </div>
                        <button onClick={handleAddManual} disabled={processingId === 'manual'} className="bg-[#cbff00] text-black font-black uppercase text-xs px-4 py-2 rounded-sm hover:bg-[#a3cc00] transition-colors disabled:opacity-50">
                            {processingId === 'manual' ? 'Adding...' : 'Confirm Assignment & Send Invite'}
                        </button>
                    </div>
                )}

                {/* Confirmed */}
                {confirmed.length > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[#cbff00] font-black uppercase text-xs tracking-widest flex items-center gap-2">
                                <UserCheck className="w-4 h-4" /> Confirmed Assignments
                            </h4>
                            {hasPrimary && hasBackup && (
                                <button 
                                    onClick={handleBackupHandoff}
                                    disabled={processingId === 'handoff'}
                                    className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-black font-black uppercase text-[10px] px-3 py-1 rounded-sm transition-colors"
                                >
                                    {processingId === 'handoff' ? 'Processing...' : 'Execute Backup Handoff'}
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {confirmed.map((o: any) => (
                                <div key={o.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-white/20"></div>
                                    <div className="pl-3">
                                        <p className="text-white font-bold text-sm flex items-center gap-2">
                                            {o.off_platform_name ? `${o.off_platform_name} (Off-Platform)` : `${o.profiles?.first_name} ${o.profiles?.last_name}`}
                                            {o.confirmed_arrival && <span className="bg-green-500 text-black text-[10px] uppercase font-black px-1.5 rounded-sm">Confirmed Arrival</span>}
                                        </p>
                                        <p className="text-gray-400 text-xs mt-1">
                                            Role: <span className="text-[#cbff00] font-bold">{o.role}</span> • {o.payout_method} Payout (${o.agreed_rate || 0})
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveOfficial(o.id)}
                                        disabled={processingId === o.id}
                                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                                    >
                                        {processingId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Open Bids */}
                {pendingBids.length > 0 && (
                    <div>
                        <h4 className="text-yellow-500 font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Market Bids
                        </h4>
                        <div className="space-y-2">
                            {pendingBids.map((b: any) => {
                                const relRating = b.profiles?.reliability_rating || 5.0;
                                const hasConflict = checkConflict(b.user_id);
                                
                                return (
                                    <div key={b.id} className="flex items-center justify-between p-3 bg-black border border-yellow-500/30 rounded-sm">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => setSelectedRefId(b.user_id)}
                                                    className="text-gray-200 font-bold text-sm hover:text-white hover:underline decoration-white/30 underline-offset-4 flex items-center gap-2"
                                                >
                                                    {b.profiles?.first_name} {b.profiles?.last_name}
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                </button>
                                                <span className="bg-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase px-2 py-0.5 rounded-sm">
                                                    Rating: {relRating}/5
                                                </span>
                                                {hasConflict && (
                                                    <span className="bg-red-500/20 text-red-500 text-[10px] font-black uppercase px-2 py-0.5 rounded-sm flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" /> Conflict
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-500 text-xs mt-1">
                                                Role: {b.role} • Bid: <span className="text-[#cbff00] font-bold">${b.bid_amount}</span> ({b.bid_type})
                                            </p>
                                            <p className="text-gray-500 text-[10px] uppercase mt-1 tracking-wider">
                                                History: {b.profiles?.completed_assignments || 0} completed / {b.profiles?.missed_assignments || 0} missed
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 items-end">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleRejectBid(b.id)}
                                                    disabled={processingId === b.id}
                                                    className="px-3 py-1.5 bg-red-500/10 text-red-500 font-black text-xs uppercase tracking-wider rounded-sm hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {processingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3"/> Reject</>}
                                                </button>
                                                <button 
                                                    onClick={() => handleAcceptBid(b)}
                                                    disabled={processingId === b.id}
                                                    className="px-3 py-1.5 bg-[#cbff00] text-black font-black text-xs uppercase tracking-wider rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {processingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3"/> Accept</>}
                                                </button>
                                            </div>
                                            {b.role === 'Primary' && (
                                                <button 
                                                    onClick={() => handleCounterAsBackup(b)}
                                                    disabled={processingId === b.id}
                                                    className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-white transition-colors"
                                                >
                                                    Counter as Backup
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Rejected Bids Accordion */}
                {rejectedBids.length > 0 && (
                    <div className="border border-white/5 rounded-sm overflow-hidden">
                        <button 
                            onClick={() => setShowRejected(!showRejected)}
                            className="w-full p-3 bg-white/5 hover:bg-white/10 flex items-center justify-between text-xs font-black text-gray-500 uppercase tracking-widest transition-colors"
                        >
                            <span>{rejectedBids.length} Rejected / Countered Bids</span>
                            {showRejected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {showRejected && (
                            <div className="p-4 bg-black space-y-2">
                                {rejectedBids.map((b: any) => (
                                    <div key={b.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-sm opacity-50">
                                        <div>
                                            <p className="text-gray-400 font-bold text-sm line-through decoration-white/20">
                                                {b.profiles?.first_name} {b.profiles?.last_name}
                                            </p>
                                            <p className="text-gray-500 text-xs mt-1">
                                                Role: {b.role} • Bid: ${b.bid_amount}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                            {b.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {officials.length === 0 && bids.length === 0 && (
                    <p className="text-gray-500 text-sm italic">No assignments or bids yet.</p>
                )}
            </div>

            {/* Profile/Schedule Modal */}
            {selectedRefId && selectedRefProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#171717] border border-white/10 w-full max-w-md rounded-xl overflow-hidden shadow-2xl relative">
                        <button 
                            onClick={() => setSelectedRefId(null)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="p-6 border-b border-white/5">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
                                {selectedRefProfile.first_name} {selectedRefProfile.last_name}
                            </h2>
                            <div className="space-y-1">
                                <p className="text-gray-400 text-sm flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> {selectedRefProfile.email}
                                </p>
                                {selectedRefProfile.phone_number && (
                                    <p className="text-gray-400 text-sm flex items-center gap-2">
                                        <Phone className="w-4 h-4" /> {selectedRefProfile.phone_number}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-black">
                            <h3 className="text-[#cbff00] font-black uppercase text-xs tracking-widest flex items-center gap-2 mb-4">
                                <Calendar className="w-4 h-4" /> Game Day Itinerary
                            </h3>
                            {selectedRefSchedule.length === 0 ? (
                                <p className="text-gray-500 text-sm italic">No other confirmed matches for this day.</p>
                            ) : (
                                <div className="space-y-3">
                                    {selectedRefSchedule.map((s: any) => {
                                        const sTime = s.matches?.start_time || s.matches?.scheduled_time;
                                        const sDate = sTime ? new Date(sTime) : null;
                                        
                                        return (
                                            <div key={s.id} className="p-3 bg-white/5 border border-white/10 rounded-sm">
                                                <p className="text-white font-bold text-sm">
                                                    {s.matches?.home_team} vs {s.matches?.away_team}
                                                </p>
                                                <p className="text-gray-400 text-xs mt-1">
                                                    {sDate ? sDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'} • {s.matches?.field_name || 'TBD'}
                                                </p>
                                                <p className="text-gray-500 text-[10px] uppercase font-bold mt-1">
                                                    Role: {s.role} • {s.matches?.games?.event_type}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
