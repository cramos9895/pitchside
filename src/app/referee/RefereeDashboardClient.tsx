'use client';

import { useState } from 'react';
import { Calendar, MapPin, Trophy, ChevronRight, ShieldAlert, DollarSign, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function RefereeDashboardClient({
    upcomingMatches,
    openMarketMatches,
    myBids,
    directInvites,
    userProfile
}: {
    upcomingMatches: any[];
    openMarketMatches: any[];
    myBids: any[];
    directInvites: any[];
    userProfile: any;
}) {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<'upcoming' | 'market' | 'bids'>('upcoming');
    
    // Stripe Onboarding State
    const [isConnectingStripe, setIsConnectingStripe] = useState(false);

    // Bidding Modal State
    const [biddingMatch, setBiddingMatch] = useState<any | null>(null);
    const [bidType, setBidType] = useState('Accept Rate');
    const [bidAmount, setBidAmount] = useState<number | string>('');
    const [bidRole, setBidRole] = useState('Primary');
    const [isSubmittingBid, setIsSubmittingBid] = useState(false);

    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const handleStripeConnect = async () => {
        setIsConnectingStripe(true);
        try {
            const res = await fetch('/api/stripe/referee-connect', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to generate connect link');
            const data = await res.json();
            window.location.href = data.url;
        } catch (error) {
            console.error(error);
            alert('Failed to connect to Stripe. Please try again later.');
            setIsConnectingStripe(false);
        }
    };

    const submitBid = async () => {
        if (!biddingMatch) return;
        setIsSubmittingBid(true);
        try {
            let finalAmount = bidAmount;
            if (bidType === 'Accept Rate') {
                finalAmount = bidRole === 'Primary' 
                    ? (biddingMatch.games?.base_pay || 0) 
                    : (biddingMatch.games?.backup_retainer_amount || 0);
            }

            const { error } = await supabase.from('match_bids').insert({
                match_id: biddingMatch.id,
                user_id: userProfile.id,
                role: bidRole,
                bid_type: bidType,
                bid_amount: Number(finalAmount),
                status: 'Pending'
            });

            if (error) {
                console.error(error);
                alert('Failed to submit bid. You may have already bid for this role on this match.');
            } else {
                window.location.reload();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmittingBid(false);
            setBiddingMatch(null);
        }
    };

    const handleInviteAction = async (officialId: string, action: 'Confirmed' | 'Declined') => {
        setIsProcessing(officialId);
        try {
            const { error } = await supabase.from('match_officials')
                .update({ status: action })
                .eq('id', officialId);
            
            if (error) throw error;
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('Failed to process invite.');
        } finally {
            setIsProcessing(null);
        }
    };

    const confirmArrival = async (officialId: string) => {
        setIsProcessing(officialId);
        try {
            const { error } = await supabase.from('match_officials')
                .update({ confirmed_arrival: true })
                .eq('id', officialId);
            
            if (error) throw error;
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('Failed to confirm arrival.');
        } finally {
            setIsProcessing(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 relative min-h-screen">
            {/* Stripe Banner */}
            {!userProfile.stripe_account_id && (
                <div className="bg-[#cbff00] text-black rounded-sm p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-[#cbff00]/10">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6" />
                        <div>
                            <h3 className="font-black uppercase tracking-tight">Setup Direct Deposits</h3>
                            <p className="font-medium text-sm text-black/80">Connect your Stripe account to receive automated payouts after matches.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleStripeConnect}
                        disabled={isConnectingStripe}
                        className="bg-black text-[#cbff00] px-6 py-2 rounded-sm font-black uppercase tracking-widest text-sm hover:bg-gray-900 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        {isConnectingStripe ? 'Connecting...' : 'Connect Stripe'}
                    </button>
                </div>
            )}

            {/* Header / Command Center */}
            <header className="mb-8 border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldAlert className="w-8 h-8 text-[#cbff00]" />
                        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight text-white">
                            Referee <span className="text-[#cbff00]">Hub</span>
                        </h1>
                    </div>
                    <p className="text-gray-400 font-medium">Your tactical command center for match assignments.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-sm">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Weekly Earnings</p>
                        <p className="text-2xl font-black text-[#cbff00]">$0.00</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-sm">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Matches</p>
                        <p className="text-2xl font-black text-white">{upcomingMatches.length} <span className="text-sm font-medium text-gray-500">assigned</span></p>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
                <button 
                    onClick={() => setActiveTab('upcoming')}
                    className={`px-6 py-3 rounded-sm font-black uppercase tracking-widest text-sm transition-colors ${activeTab === 'upcoming' ? 'bg-[#cbff00] text-black' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                >
                    Upcoming ({upcomingMatches.length})
                </button>
                <button 
                    onClick={() => setActiveTab('market')}
                    className={`px-6 py-3 rounded-sm font-black uppercase tracking-widest text-sm transition-colors ${activeTab === 'market' ? 'bg-[#cbff00] text-black' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                >
                    Open Market ({openMarketMatches.length})
                </button>
                <button 
                    onClick={() => setActiveTab('bids')}
                    className={`px-6 py-3 rounded-sm font-black uppercase tracking-widest text-sm transition-colors ${activeTab === 'bids' ? 'bg-[#cbff00] text-black' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                >
                    Bids & Invites ({myBids.length + directInvites.length})
                </button>
            </div>

            {/* Tab Contents */}
            <div className="space-y-4">
                
                {/* UPCOMING SLATE */}
                {activeTab === 'upcoming' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingMatches.length === 0 && <p className="text-gray-500 font-medium col-span-full">No upcoming matches.</p>}
                        {upcomingMatches.map((official) => {
                            const match = official.matches;
                            const matchDate = match.scheduled_time || match.start_time;
                            const dateObj = matchDate ? new Date(matchDate) : null;
                            const dateString = dateObj ? dateObj.toLocaleString() : 'TBD';
                            
                            // Check if within 30 mins
                            let isWithin30Mins = false;
                            if (dateObj) {
                                const diffMs = dateObj.getTime() - new Date().getTime();
                                isWithin30Mins = diffMs > 0 && diffMs <= 30 * 60 * 1000;
                            }

                            return (
                                <div key={official.id} className="border border-white/10 bg-white/5 rounded-sm p-5 flex flex-col relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-white/10 px-3 py-1 text-xs font-black uppercase rounded-bl-sm text-gray-300">
                                        {official.role}
                                    </div>
                                    <div className="mb-4 mt-2">
                                        <h3 className="text-xl font-black uppercase tracking-tight">{match.home_team} vs {match.away_team}</h3>
                                        <div className="text-sm text-gray-400 mt-2 flex items-center gap-2"><Calendar className="w-4 h-4"/> {dateString}</div>
                                        <div className="text-sm text-gray-400 mt-1 flex items-center gap-2"><MapPin className="w-4 h-4"/> {match.field_name || 'TBD'}</div>
                                    </div>
                                    
                                    <div className="mt-auto space-y-3 pt-4 border-t border-white/10">
                                        {isWithin30Mins && !official.confirmed_arrival && (
                                            <button 
                                                onClick={() => confirmArrival(official.id)}
                                                disabled={isProcessing === official.id}
                                                className="w-full py-2 bg-yellow-500 text-black font-black uppercase text-xs rounded-sm hover:bg-yellow-400 flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle className="w-4 h-4"/> Confirm Arrival (Required)
                                            </button>
                                        )}
                                        {official.confirmed_arrival && (
                                            <div className="w-full py-2 bg-green-500/20 text-green-400 font-black uppercase text-xs rounded-sm flex items-center justify-center gap-2">
                                                <CheckCircle className="w-4 h-4"/> Arrival Confirmed
                                            </div>
                                        )}
                                        <Link 
                                            href={`/referee/matches/${match.id}`}
                                            className="w-full py-3 flex items-center justify-center gap-2 rounded-sm font-black uppercase tracking-widest text-sm bg-[#cbff00] text-black hover:bg-[#a3cc00] transition-colors"
                                        >
                                            Match Hub <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* OPEN MARKET */}
                {activeTab === 'market' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {openMarketMatches.length === 0 && <p className="text-gray-500 font-medium col-span-full">No open matches currently available.</p>}
                        {openMarketMatches.map((match) => {
                            const matchDate = match.scheduled_time || match.start_time;
                            const dateString = matchDate ? new Date(matchDate).toLocaleString() : 'TBD';
                            
                            // Check if current user has already bid
                            const hasBid = match.match_bids?.some((b: any) => b.user_id === userProfile.id);

                            return (
                                <div key={match.id} className="border border-white/10 bg-black rounded-sm p-5 hover:border-white/30 transition-colors flex flex-col">
                                    <div className="mb-4">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-sm bg-white/10 text-gray-300 mb-3 inline-block">
                                                {match.games?.event_type || 'League'}
                                            </span>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 font-bold uppercase">Expected Rate</p>
                                                <p className="text-[#cbff00] font-black text-lg">${match.games?.base_pay || 0}</p>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-white">{match.home_team} vs {match.away_team}</h3>
                                    </div>
                                    <div className="space-y-2 mb-6 text-sm text-gray-500 font-medium">
                                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {dateString}</div>
                                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {match.field_name || 'TBD'}</div>
                                    </div>
                                    
                                    <div className="mt-auto">
                                        {hasBid ? (
                                            <div className="w-full py-3 flex items-center justify-center gap-2 border border-white/10 rounded-sm font-black uppercase tracking-widest text-sm text-gray-500 bg-white/5">
                                                Bid Submitted
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setBiddingMatch(match)}
                                                className="w-full py-3 flex items-center justify-center gap-2 border border-[#cbff00] text-[#cbff00] rounded-sm font-black uppercase tracking-widest text-sm hover:bg-[#cbff00] hover:text-black transition-colors"
                                            >
                                                Submit Bid
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* BIDS & INVITES */}
                {activeTab === 'bids' && (
                    <div className="space-y-12">
                        {/* Direct Invites */}
                        <section>
                            <h2 className="text-xl font-black italic uppercase mb-4 text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-500" /> Direct Invites
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {directInvites.length === 0 && <p className="text-gray-500 font-medium">No pending invites.</p>}
                                {directInvites.map(invite => {
                                    const match = invite.matches;
                                    const dateString = match.scheduled_time ? new Date(match.scheduled_time).toLocaleString() : 'TBD';
                                    return (
                                        <div key={invite.id} className="border border-yellow-500/30 bg-yellow-500/5 rounded-sm p-4 flex justify-between items-center">
                                            <div>
                                                <h3 className="font-black uppercase">{match.home_team} vs {match.away_team}</h3>
                                                <p className="text-xs text-gray-400">{dateString}</p>
                                                <p className="text-xs text-[#cbff00] mt-1 font-bold">Role: {invite.role} | Rate: ${invite.agreed_rate || 'N/A'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleInviteAction(invite.id, 'Confirmed')} disabled={isProcessing === invite.id} className="p-2 bg-green-500/20 text-green-500 hover:bg-green-500/40 rounded-sm"><CheckCircle className="w-5 h-5"/></button>
                                                <button onClick={() => handleInviteAction(invite.id, 'Declined')} disabled={isProcessing === invite.id} className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500/40 rounded-sm"><XCircle className="w-5 h-5"/></button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>

                        {/* My Bids */}
                        <section>
                            <h2 className="text-xl font-black italic uppercase mb-4 text-white flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-gray-400" /> Pending Bids
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {myBids.length === 0 && <p className="text-gray-500 font-medium">No active bids.</p>}
                                {myBids.map(bid => {
                                    const match = bid.matches;
                                    const dateString = match?.scheduled_time ? new Date(match.scheduled_time).toLocaleString() : 'TBD';
                                    return (
                                        <div key={bid.id} className="border border-white/10 bg-white/5 rounded-sm p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-black uppercase">{match?.home_team} vs {match?.away_team}</h3>
                                                    <p className="text-xs text-gray-400">{dateString}</p>
                                                </div>
                                                <span className={`text-xs font-black uppercase px-2 py-1 rounded-sm ${bid.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500' : bid.status === 'Accepted' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                    {bid.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Role</p>
                                                    <p className="text-sm text-white font-medium">{bid.role}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Bid Amount</p>
                                                    <p className="text-sm text-[#cbff00] font-black">${bid.bid_amount} <span className="text-gray-400 text-xs">({bid.bid_type})</span></p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    </div>
                )}
            </div>

            {/* Bidding Modal Overlay */}
            {biddingMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#171717] border border-white/10 rounded-sm p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black italic uppercase">Submit Bid</h2>
                            <button onClick={() => setBiddingMatch(null)} className="text-gray-400 hover:text-white"><XCircle className="w-6 h-6"/></button>
                        </div>

                        <div className="mb-6 p-4 bg-white/5 rounded-sm">
                            <h3 className="font-bold uppercase text-white mb-2">{biddingMatch.home_team} vs {biddingMatch.away_team}</h3>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Base Pay:</span>
                                <span className="text-[#cbff00] font-bold">${biddingMatch.games?.base_pay || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-400">Backup Retainer:</span>
                                <span className="text-[#cbff00] font-bold">${biddingMatch.games?.backup_retainer_amount || 0}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Role</label>
                                <div className="flex gap-2">
                                    {['Primary', 'Backup'].map(r => (
                                        <button 
                                            key={r}
                                            onClick={() => setBidRole(r)}
                                            className={`flex-1 py-2 rounded-sm font-bold text-sm border ${bidRole === r ? 'bg-white text-black border-white' : 'bg-transparent border-white/20 text-gray-400 hover:border-white/50'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Bid Strategy</label>
                                <select 
                                    value={bidType}
                                    onChange={(e) => setBidType(e.target.value)}
                                    className="w-full bg-black border border-white/20 text-white rounded-sm p-3 font-medium outline-none focus:border-[#cbff00]"
                                >
                                    <option value="Accept Rate">Accept Standard Rate</option>
                                    <option value="Lower">Bid Lower (More Competitive)</option>
                                    <option value="Higher">Bid Higher (Premium Request)</option>
                                </select>
                            </div>

                            {bidType !== 'Accept Rate' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Your Rate ($)</label>
                                    <input 
                                        type="number"
                                        value={bidAmount}
                                        onChange={(e) => setBidAmount(e.target.value)}
                                        placeholder="e.g. 50"
                                        className="w-full bg-black border border-white/20 text-white rounded-sm p-3 font-bold text-lg outline-none focus:border-[#cbff00]"
                                    />
                                </div>
                            )}

                            <button 
                                onClick={submitBid}
                                disabled={isSubmittingBid || (bidType !== 'Accept Rate' && !bidAmount)}
                                className="w-full py-4 mt-4 rounded-sm font-black uppercase tracking-widest text-sm disabled:opacity-50 transition-colors bg-[#cbff00] text-black hover:bg-[#a3cc00]"
                            >
                                {isSubmittingBid ? 'Submitting...' : 'Confirm Bid'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
