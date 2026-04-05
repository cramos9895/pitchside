'use client';

import { useState } from 'react';
import { FreeAgentCard } from '@/components/FreeAgentCard';
import { draftFreeAgent } from '@/app/actions/draft-free-agent';
import { Trophy, Users, Search, Filter, Loader2, ArrowRight, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FreeAgentPoolClientProps {
    freeAgents: any[];
    currentUser: any;
    userBookings: any[]; // Used to determine Captain status
}

export function FreeAgentPoolClient({ freeAgents, currentUser, userBookings }: FreeAgentPoolClientProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [positionFilter, setPositionFilter] = useState('All');
    const [isDrafting, setIsDrafting] = useState(false);

    // A user is a "Captain" if they have vaulted their card in any active booking
    const captainBookings = userBookings.filter(b => b.stripe_payment_method_id && (b.status === 'paid' || b.status === 'active'));
    const isGlobalCaptain = captainBookings.length > 0;

    const filteredAgents = freeAgents.filter(agent => {
        const matchesSearch = agent.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             agent.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPosition = positionFilter === 'All' || agent.profiles?.position === positionFilter;
        return matchesSearch && matchesPosition;
    });

    const handleDraft = async (bookingId: string, teamAssignment: string) => {
        setIsDrafting(true);
        try {
            const result = await draftFreeAgent(bookingId, teamAssignment);
            if (result.success) {
                alert("Player drafted successfully! Roster updated.");
                router.refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsDrafting(false);
        }
    };

    const positions = ['All', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

    return (
        <div className="space-y-12 animate-in fade-in duration-700 text-white pt-2 relative">
            {/* Ambient Background */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(204,255,0,0.03)_0%,transparent_50%)] pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5 relative z-10">
                <div className="space-y-1">
                    <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
                        FREE AGENT <span className="text-pitch-accent">POOL</span>
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-pitch-secondary pl-1">
                        Draft Hub / Available Talent
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {isGlobalCaptain ? (
                        <div className="bg-blue-500/10 border border-blue-500/20 px-6 py-3 rounded-sm flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400/70">Captain Status</span>
                                <span className="text-sm font-black uppercase tracking-widest text-white leading-none mt-1">Drafting Enabled</span>
                            </div>
                        </div>
                    ) : (
                        <Link href="/schedule?view=pickup" className="group flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-sm hover:bg-pitch-accent hover:border-pitch-accent transition-all">
                            <Zap className="w-4 h-4 text-pitch-accent group-hover:text-pitch-black transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white group-hover:text-pitch-black">Register to Play</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
                <div className="md:col-span-8">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-pitch-accent transition-colors" />
                        <input 
                            type="text"
                            placeholder="SEARCH BY PLAYER NAME OR EMAIL..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm py-4 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-pitch-accent/50 focus:bg-white/[0.07] transition-all"
                        />
                    </div>
                </div>
                <div className="md:col-span-4">
                    <div className="flex items-center gap-2">
                        {positions.map(pos => (
                            <button
                                key={pos}
                                onClick={() => setPositionFilter(pos)}
                                className={cn(
                                    "flex-1 py-4 px-2 rounded-sm text-[8px] font-black uppercase tracking-widest border transition-all",
                                    positionFilter === pos 
                                        ? "bg-pitch-accent text-pitch-black border-pitch-accent shadow-lg shadow-pitch-accent/10" 
                                        : "bg-white/5 border-white/5 text-gray-500 hover:border-white/20 hover:text-white"
                                )}
                            >
                                {pos}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content: Free Agent Grid */}
            <div className="relative z-10">
                {filteredAgents.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-12 gap-x-4">
                        {filteredAgents.map(agent => {
                            // Find the specific config for the game this agent is assigned to
                            const agentGame = agent.games;
                            const isCaptainOfThisGame = captainBookings.some(b => b.game_id === agent.game_id);

                            return (
                                <div key={agent.id} className="space-y-4">
                                    <FreeAgentCard 
                                        player={{
                                            ...agent.profiles,
                                            // Ensure some defaults for card tiers if not present
                                            ovr: agent.profiles?.ovr || 70,
                                            matches_played: agent.profiles?.matches_played || 0,
                                            wins: agent.profiles?.wins || 0
                                        }}
                                        bookingId={agent.id}
                                        gameId={agent.game_id}
                                        teamsConfig={agentGame?.teams_config}
                                        isCaptain={isCaptainOfThisGame}
                                        onDraft={handleDraft}
                                    />
                                    <div className="px-2 text-center">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-pitch-secondary mb-1">Registered For:</p>
                                        <p className="text-[10px] font-bold text-white uppercase truncate">{agentGame?.title || 'League Match'}</p>
                                        <p className="text-[8px] font-medium text-gray-500 uppercase tracking-tighter mt-1">
                                            {new Date(agentGame?.start_time).toLocaleDateString()} @ {agentGame?.location_nickname || 'Pitch'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-[#111] border border-dashed border-white/10 rounded-sm p-16 text-center">
                        <Users className="w-12 h-12 text-pitch-secondary mx-auto mb-6 opacity-20" />
                        <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-2">No Free Agents Found</h4>
                        <p className="text-xs text-pitch-secondary uppercase tracking-widest mb-8">Try adjusting your filters or search query</p>
                        <button 
                            onClick={() => { setSearchQuery(''); setPositionFilter('All'); }}
                            className="px-8 py-3 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-white hover:text-pitch-black transition-all"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Info Legend */}
            <div className="relative z-10 pt-12 border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <Zap className="w-5 h-5 text-pitch-accent" />
                            <h5 className="font-heading font-black italic uppercase text-lg">Instant Recruiting</h5>
                        </div>
                        <p className="text-xs text-gray-500 tracking-wider leading-relaxed">
                            Drafting a free agent instantly adds them to your squad roster. Their registration fee is automatically charged to their vaulted payment method.
                        </p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            <h5 className="font-heading font-black italic uppercase text-lg">Card Rankings</h5>
                        </div>
                        <p className="text-xs text-gray-500 tracking-wider leading-relaxed">
                            Player OVR and card tiers (Gold, Silver, Bronze) are calculated based on lifetime PITCHSIDE match performance, win percentages, and MVP awards.
                        </p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="w-5 h-5 text-blue-400" />
                            <h5 className="font-heading font-black italic uppercase text-lg">Eligibility</h5>
                        </div>
                        <p className="text-xs text-gray-500 tracking-wider leading-relaxed">
                            A player is only "Free Agent Available" if they have completed their PITCHSIDE profile and successfully vaulted a valid card in Stripe.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
