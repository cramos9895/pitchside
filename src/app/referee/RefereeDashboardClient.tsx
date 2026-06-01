'use client';

import { useState } from 'react';
import { Calendar, MapPin, Trophy, ChevronRight, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function RefereeDashboardClient({
    upcomingMatches,
    openMarketMatches,
    userProfile
}: {
    upcomingMatches: any[];
    openMarketMatches: any[];
    userProfile: any;
}) {
    const supabase = createClient();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const handleApplication = async (matchId: string, type: 'request' | 'waitlist') => {
        setIsProcessing(matchId);
        try {
            const status = type === 'request' ? 'Pending' : 'Waitlist';
            const { error } = await supabase.from('match_officials').insert({
                match_id: matchId,
                user_id: userProfile.id,
                role: 'Center',
                status: status
            });
            
            if (error) {
                console.error('Error applying for match:', error);
                alert('Failed to apply. Please try again.');
            } else {
                // In a real app we'd mutate or refresh the router, but reloading is simple
                window.location.reload();
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setIsProcessing(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            {/* Header / Command Center */}
            <header className="mb-16 border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Upcoming Slate Section */}
                <section>
                    <h2 className="text-2xl font-black italic uppercase mb-6 flex items-center gap-2 border-b border-white/10 pb-3 text-white">
                        <Calendar className="w-5 h-5 text-[#cbff00]" /> Upcoming Slate
                    </h2>
                    
                    <div className="space-y-4">
                        {upcomingMatches.length === 0 ? (
                            <div className="p-8 border border-white/10 bg-white/5 rounded-sm text-center">
                                <p className="text-gray-500 font-medium">No matches assigned. Check the Open Market.</p>
                            </div>
                        ) : (
                            upcomingMatches.map((official) => {
                                const match = official.matches;
                                const matchDate = match.scheduled_time || match.start_time;
                                const dateString = matchDate ? new Date(matchDate).toLocaleString() : 'TBD';
                                
                                return (
                                <div key={official.id} className="group border border-white/10 bg-white/5 rounded-sm p-5 hover:border-[#cbff00]/50 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-sm bg-[#cbff00]/10 text-[#cbff00] mb-3 inline-block">
                                                {match.match_style || 'Standard'} Mode
                                            </span>
                                            <h3 className="text-xl font-black uppercase tracking-tight">{match.home_team} vs {match.away_team}</h3>
                                        </div>
                                        <span className="text-lg font-black text-white">--</span>
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                                            <Calendar className="w-4 h-4" /> {dateString}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                                            <MapPin className="w-4 h-4" /> {match.field_name || 'TBD'}
                                        </div>
                                    </div>
                                    <Link 
                                        href={`/referee/matches/${match.id}`}
                                        className="w-full py-3 flex items-center justify-center gap-2 rounded-sm font-black uppercase tracking-widest text-sm transition-transform hover:scale-[1.02]"
                                        style={{ backgroundImage: 'linear-gradient(to right, #cbff00, #cbff00)', color: '#000000' }}
                                    >
                                        Check In <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            )})
                        )}
                    </div>
                </section>

                {/* Open Market Section */}
                <section>
                    <h2 className="text-2xl font-black italic uppercase mb-6 flex items-center gap-2 border-b border-white/10 pb-3 text-white">
                        <Trophy className="w-5 h-5 text-gray-400" /> Open Market
                    </h2>
                    
                    <div className="space-y-4">
                        {openMarketMatches.length === 0 ? (
                            <div className="p-8 border border-white/10 bg-white/5 rounded-sm text-center">
                                <p className="text-gray-500 font-medium">No open matches available right now.</p>
                            </div>
                        ) : (
                            openMarketMatches.map((match) => {
                                const matchDate = match.scheduled_time || match.start_time;
                                const dateString = matchDate ? new Date(matchDate).toLocaleString() : 'TBD';
                                
                                // Check if a Center official is confirmed
                                const hasConfirmedCenter = match.match_officials?.some((mo: any) => mo.role === 'Center' && mo.status === 'Confirmed');
                                // Check if current user has already applied or is waitlisted
                                const hasApplied = match.match_officials?.some((mo: any) => mo.user_id === userProfile.id);

                                return (
                                <div key={match.id} className="group border border-white/10 bg-black rounded-sm p-5 hover:border-white/30 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-sm bg-white/10 text-gray-300 mb-3 inline-block">
                                                {match.match_style || 'Standard'} Mode
                                            </span>
                                            <h3 className="text-xl font-black uppercase tracking-tight text-gray-300 group-hover:text-white transition-colors">{match.home_team} vs {match.away_team}</h3>
                                        </div>
                                        <span className="text-lg font-black text-gray-400 group-hover:text-white transition-colors">--</span>
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                            <Calendar className="w-4 h-4" /> {dateString}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                            <MapPin className="w-4 h-4" /> {match.field_name || 'TBD'}
                                        </div>
                                    </div>
                                    
                                    {hasApplied ? (
                                        <div className="w-full py-3 flex items-center justify-center gap-2 border border-white/10 rounded-sm font-black uppercase tracking-widest text-sm text-gray-500 bg-white/5">
                                            Application Sent
                                        </div>
                                    ) : hasConfirmedCenter ? (
                                        <button 
                                            onClick={() => handleApplication(match.id, 'waitlist')}
                                            disabled={isProcessing === match.id}
                                            className="w-full py-3 flex items-center justify-center gap-2 border border-white/20 rounded-sm font-black uppercase tracking-widest text-sm text-white hover:bg-white hover:text-black transition-all disabled:opacity-50"
                                        >
                                            {isProcessing === match.id ? 'Requesting...' : 'Join Waitlist'}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleApplication(match.id, 'request')}
                                            disabled={isProcessing === match.id}
                                            className="w-full py-3 flex items-center justify-center gap-2 rounded-sm font-black uppercase tracking-widest text-sm transition-transform hover:scale-[1.02] disabled:opacity-50"
                                            style={{ backgroundImage: 'linear-gradient(to right, #cbff00, #cbff00)', color: '#000000' }}
                                        >
                                            {isProcessing === match.id ? 'Requesting...' : 'Request Match'}
                                        </button>
                                    )}
                                </div>
                            )})
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
