'use client';

import { Calendar, Users, Trophy, ArrowRight, MapPin, Clock, DollarSign, Footprints, Layers, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface RollingLeagueData {
    id: string;
    title?: string;
    location?: string;
    location_nickname?: string;
    start_time?: string | null;
    league_end_date?: string | null;
    team_price?: number | null;
    free_agent_price?: number | null;
    max_teams?: number | null;
    prize_type?: string | null;
    prize_pool_percentage?: number | null;
    fixed_prize_amount?: number | null;
    reward?: string | null;
    
    // Rolling Specifics
    payment_collection_type?: 'stripe' | 'cash';
    cash_fee_structure?: string;
    cash_amount?: number | null;
    allow_free_agents?: boolean;
    team_registration_fee?: number | null;
    player_registration_fee?: number | null;
    game_format_type?: string;
    field_size?: string;
    game_format?: string;
    total_game_time?: number | null;
    shoe_types?: string[];
}

interface Registration {
    user_id: string;
    team_id: string | null;
    role: string;
}

interface RollingLeagueCardProps {
    league: RollingLeagueData;
    userId?: string;
    registrations?: Registration[];
}

export function RollingLeagueCard({ league, userId, registrations }: RollingLeagueCardProps) {
    const router = useRouter();

    const userReg = userId ? registrations?.find(r => r.user_id === userId) : null;
    const userRole = userReg?.role;
    const userTeamId = userReg?.team_id;

    const title = league.title || 'Untitled Rolling League';
    
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'TBD';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getPrizeDisplay = () => {
        if (!league.prize_type || league.prize_type === 'No Official Prize') return 'Bragging Rights';
        if (league.prize_type === 'Percentage Pool (Scaling Pot)') {
            return `${league.prize_pool_percentage || 0}% Pool`;
        }
        if (league.prize_type === 'Fixed Cash Bounty') {
            return `$${league.fixed_prize_amount || 0} Bounty`;
        }
        if (league.prize_type === 'Physical Item') {
            return league.reward || 'Trophy';
        }
        return 'TBD';
    };

    const isCash = league.payment_collection_type === 'cash';

    return (
        <div className="bg-pitch-card border border-white/5 rounded-sm p-6 shadow-2xl hover:border-pitch-accent/20 transition-all group overflow-hidden relative flex flex-col h-full">
            {/* Glossy Overlay Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            {/* Status Indicator Bar */}
            <div className="absolute top-0 left-0 w-1 h-full bg-[#cbff00] opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col h-full pl-2">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="bg-[#cbff00]/10 border border-[#cbff00]/20 px-2 py-0.5 rounded-full">
                                <span className="text-[8px] font-black uppercase text-[#cbff00] tracking-widest whitespace-nowrap">Rolling League</span>
                            </div>
                            {isCash && (
                                <div className="bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                                    <span className="text-[8px] font-black uppercase text-orange-500 tracking-widest whitespace-nowrap">Cash Collection</span>
                                </div>
                            )}
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-[0.85] mb-4 font-sans break-words overflow-hidden">
                            {title}
                        </h2>
                        <div className="flex flex-col gap-2 text-pitch-secondary text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-[#cbff00]" />
                                {league.location_nickname || (league.location && league.location.split(',')[0]) || 'Remote / TBD'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline Matrix */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-[#cbff00] transition-colors flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" /> Starts
                        </div>
                        <div className="text-white font-bold text-[11px] uppercase">{formatDate(league.start_time ?? null)}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-[#cbff00] transition-colors flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Duration
                        </div>
                        <div className="text-white font-bold text-[11px] uppercase">{league.total_game_time ? `${league.total_game_time}m` : 'TBD'}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-sm border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest group-hover/item:text-[#cbff00] transition-colors flex items-center gap-1">
                             Prize
                        </div>
                        <div className="text-[#cbff00] font-black text-[10px] uppercase truncate">{getPrizeDisplay()}</div>
                    </div>
                </div>

                {/* Specs Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-1">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1"><Layers className="w-2 h-2" /> Format & Field Size</span>
                        <span className="text-[10px] text-white font-bold uppercase">{league.game_format_type || 'League Play'} - {league.field_size || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1"><Activity className="w-2 h-2" /> Surface Type</span>
                        <span className="text-[10px] text-white font-bold uppercase truncate">{league.shoe_types?.join(', ') || 'Standard / Turf'}</span>
                    </div>
                </div>

                <div className="mb-6 px-1">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1"><Footprints className="w-2 h-2" /> Recommended Gear</span>
                        <span className="text-[10px] text-white font-bold uppercase truncate">{league.shoe_types?.join(', ') || 'Any'}</span>
                    </div>
                </div>

                {/* Financial Section */}
                <div className="mb-8 p-4 bg-white/5 border border-white/5 rounded-sm space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-gray-500">Team Entry</span>
                        <span className="text-white">{isCash ? 'Cash at Door' : league.team_price ? `$${league.team_price}` : 'FREE'}</span>
                    </div>
                    
                    {isCash ? (
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] text-[#cbff00] font-black uppercase tracking-widest italic">Door Fee: {league.cash_fee_structure}</span>
                            <span className="text-lg font-black italic text-[#cbff00]">${league.cash_amount || 0}</span>
                        </div>
                    ) : (
                        league.team_registration_fee && (
                            <div className="flex justify-between items-center">
                                <span className="text-[8px] text-[#cbff00] font-black uppercase tracking-widest italic">Admin Deposit Required</span>
                                <span className="text-lg font-black italic text-[#cbff00]">${league.team_registration_fee}</span>
                            </div>
                        )
                    )}

                    {league.allow_free_agents && (
                        <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-gray-500">Free Agent Cost</span>
                            <span className="text-white">${league.free_agent_price || 0} {isCash ? '/ Match' : '/ Season'}</span>
                        </div>
                    )}
                </div>

                {/* Action Footer */}
                <div className="mt-auto">
                    {userRole === 'captain' && userTeamId ? (
                        <button
                            onClick={() => router.push(`/tournaments/${league.id}/team/${userTeamId}`)}
                            className="w-full py-4 bg-[#cbff00] text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.15)] rounded-sm group/btn"
                        >
                            Captain's Command Center <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : (userRole === 'player' || userRole === 'registered') && userTeamId ? (
                        <button
                            onClick={() => router.push(`/tournaments/${league.id}/team/${userTeamId}`)}
                            className="w-full py-4 bg-transparent border border-white/20 text-white font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all transform active:scale-95 flex items-center justify-center gap-2 rounded-sm group/btn"
                        >
                            Team Hub <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : userRole ? (
                        <button
                            onClick={() => router.push(`/games/${league.id}`)}
                            className="w-full py-4 bg-transparent border border-white/20 text-white font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all transform active:scale-95 flex items-center justify-center gap-2 rounded-sm group/btn"
                        >
                            League Lobby <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push(`/games/${league.id}`)}
                            className="w-full py-4 bg-[#cbff00] text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(204,255,0,0.2)] rounded-sm group/btn"
                        >
                            Explore Details <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
