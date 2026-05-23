'use client';

import React from 'react';
import { 
    Calendar, MapPin, Clock, Trophy, Shield, 
    Activity, Layers, ArrowRight, ScrollText, Zap, Footprints,
    UserPlus, Users, Crown, Lock, ShieldCheck, XCircle
} from 'lucide-react';
import Link from 'next/link';
import { isLeagueLocked } from '@/lib/league-utils';
import { useState, useTransition } from 'react';
import { withdrawFromRollingLeague } from '@/app/actions/rolling-league-registration';
import { PitchSideConfirmModal } from '@/components/public/PitchSideConfirmModal';

interface Team {
    id: string;
    name: string;
    primary_color: string | null;
    captain_name: string;
    player_count: number;
    accepting_free_agents: boolean;
}

interface LeagueLobbyClientProps {
    league: {
        id: string;
        title: string;
        location: string;
        location_nickname?: string;
        location_name?: string;
        start_time: string;
        end_time: string | null;
        team_price: number | null;
        team_registration_fee?: number;
        player_registration_fee?: number;
        free_agent_price: number | null;
        cash_amount?: number;
        price?: number;
        payment_collection_type?: 'stripe' | 'cash';
        league_format: string;
        event_type: string;
        regular_season_start?: string;
        playoff_start_date?: string;
        rules_description?: string;
        waiver_details?: string;
        game_format_type?: string;
        field_size?: string;
        surface_type?: string;
        shoe_types?: string[];
        half_length?: number;
        total_game_time?: number;
        match_style?: string;
        prize_type?: string;
        reward?: string;
        fixed_prize_amount?: number;
        prize_pool_percentage?: number;
        allow_free_agents?: boolean;
    };
    teams: Team[];
    primaryHost?: { name: string; email: string } | null;
    userRole?: 'unregistered' | 'free_agent' | 'player' | 'captain';
    currentUserId?: string;
}

export function LeagueLobbyClient({ league, teams, primaryHost, userRole = 'unregistered', currentUserId }: LeagueLobbyClientProps) {
    const [isPending, startTransition] = useTransition();
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

    const executeWithdraw = () => {
        startTransition(async () => {
            try {
                await withdrawFromRollingLeague(league.id);
                setIsWithdrawModalOpen(false);
                window.location.reload();
            } catch (err) {
                console.error("Failed to withdraw:", err);
                setIsWithdrawModalOpen(false);
            }
        });
    };

    const isLocked = isLeagueLocked(league as any);
    const isCash = league.payment_collection_type === 'cash';
    
    const gameDate = new Date(league.start_time);
    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const getPrizeDisplay = () => {
        const type = league.prize_type?.toLowerCase();
        
        if (!league.prize_type || type?.includes('no official') || type === 'none') return 'Bragging Rights';
        if (type?.includes('percentage pool') || type === 'pool') return `${league.prize_pool_percentage || 0}% Pool`;
        if (type?.includes('fixed cash bounty') || type === 'fixed') return `$${league.fixed_prize_amount || 0}`;
        if (type?.includes('physical item') || type === 'physical') return league.reward || 'Trophy';
        
        return 'Competitive Glory';
    };

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pb-40 relative overflow-x-hidden">
            {/* Glossy Header Background */}
            <div className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-blue-600/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="max-w-6xl mx-auto px-6 pt-16 relative z-10">
                {/* Hero Sales Pitch Section */}
                <div className="mb-20 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8">
                        <div className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded uppercase tracking-[0.2em]">
                            Multi-Week League
                        </div>
                        {isCash && (
                            <div className="bg-orange-500/20 text-orange-400 text-[10px] font-black px-3 py-1 rounded border border-orange-500/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Zap className="w-3 h-3" /> Pay at Field
                            </div>
                        )}
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.85] mb-12 drop-shadow-2xl">
                        {league.title}
                    </h1>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-16 gap-y-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] block">
                                Season Kickoff
                            </span>
                            <p className="text-2xl font-bold text-white uppercase italic">{dateStr}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] block">
                                Arena Location
                            </span>
                            <p className="text-2xl font-bold text-white uppercase italic truncate">
                                {league.location_nickname || league.location_name || league.location.split(',')[0]}
                            </p>
                        </div>
                        {primaryHost && (
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] block">
                                    League Host
                                </span>
                                <div className="flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-blue-500" />
                                    <p className="text-2xl font-bold text-white uppercase italic">{primaryHost.name}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
                    {/* Primary Content: Intelligence Matrix */}
                    <div className="lg:col-span-8 space-y-12">
                        
                        <section className="bg-pitch-card border border-white/5 p-10 rounded-sm relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                            
                            <h3 className="font-heading text-2xl font-black italic uppercase mb-12 flex items-center gap-3 text-blue-500">
                                <Shield className="w-6 h-6" /> League Specs
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                                {/* Row 1 */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-blue-500" /> Match Format
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">{league.game_format_type || 'League Standard'}</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-blue-500" /> Field Size
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">
                                        {league.field_size || 'Standard'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-blue-500" /> Surface Type
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">
                                        {league.surface_type || 'Turf'}
                                    </p>
                                </div>

                                {/* Row 2 */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-500" /> Half Length
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">
                                        {league.half_length || '0'} Min
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-blue-500" /> Total Game Time
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">
                                        {(league.half_length || 0) * 2} Min
                                    </p>
                                </div>
                                
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-blue-500" /> Match Style
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">{league.match_style || 'Standard'}</p>
                                </div>

                                {/* Row 3 */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Footprints className="w-4 h-4 text-blue-500" /> Shoe Types
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic truncate">
                                        {league.shoe_types?.join(' / ') || 'Cleats / Turf'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-blue-500" /> Grand Prize
                                    </span>
                                    <p className="text-lg font-bold text-blue-500 uppercase italic">{getPrizeDisplay()}</p>
                                </div>
                            </div>
                        </section>

                        <section className="bg-pitch-card border border-white/5 p-10 rounded-sm">
                            <h3 className="font-heading text-2xl font-black italic uppercase mb-8 flex items-center gap-3 text-white">
                                <ScrollText className="w-6 h-6 text-blue-500" /> Terms & Rules
                            </h3>
                            <div className="bg-black/40 border border-white/10 p-8 rounded-sm text-sm text-gray-400 leading-relaxed font-medium whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar italic tracking-wide">
                                {league.rules_description || league.waiver_details || "Players must adhere to the facility rules. No dangerous play allowed. Respect the referee decision. All registrations are final once the season begins."}
                            </div>
                        </section>

                        <section className="bg-pitch-card border border-white/5 p-10 rounded-sm">
                            <h3 className="font-heading text-2xl font-black italic uppercase mb-8 flex items-center gap-3 text-white">
                                <Users className="w-6 h-6 text-blue-500" /> Competing Squads
                            </h3>
                            
                            {!teams || teams.length === 0 ? (
                                <div className="bg-black/40 border border-white/10 p-12 rounded-sm text-center">
                                    <p className="text-pitch-secondary font-bold uppercase italic tracking-widest text-sm mb-2">No squads have entered the arena yet</p>
                                    <p className="text-gray-500 text-xs uppercase tracking-widest">Be the first to plant your flag.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {teams.map((team) => (
                                        <div key={team.id} className="bg-black/40 border border-white/5 p-6 rounded-sm space-y-4 relative overflow-hidden group hover:border-white/20 transition-all">
                                            <div 
                                                className="w-1 absolute inset-y-0 left-0" 
                                                style={{ backgroundColor: team.primary_color || '#2563eb' }}
                                            />
                                            <div className="flex justify-between items-start text-left ml-2">
                                                <div>
                                                    <h4 className="text-xl font-bold text-white uppercase italic">{team.name}</h4>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Led by {team.captain_name}</p>
                                                </div>
                                                <div className="bg-white/5 px-2 py-1 rounded text-[10px] font-black text-white uppercase tracking-widest shrink-0">
                                                    {team.player_count} Players
                                                </div>
                                            </div>
                                            
                                            {team.accepting_free_agents && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-600/20 rounded-full w-fit ml-2">
                                                    <UserPlus className="w-3 h-3 text-blue-500" />
                                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Recruiting Free Agents</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Sidebar: Financial Breakdown */}
                    <div className="lg:col-span-4 space-y-6">
                        <section className="bg-blue-600 text-white p-10 rounded-sm relative shadow-[0_0_50px_rgba(37,99,235,0.15)]">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-10 border-b border-white/20 pb-4">
                                Season Pricing
                            </h3>
                            
                            <div className="space-y-10">
                                {/* 1. Team Registration Fee */}
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
                                        <Users className="w-3 h-3" /> Team Registration
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black italic">
                                            ${league.team_registration_fee || league.team_price || 0}
                                        </span>
                                        <span className="text-[10px] font-black uppercase opacity-80">
                                            Upfront Entry
                                        </span>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-wider opacity-60 mt-1">
                                        Per Team Registration Fee
                                    </p>
                                </div>

                                {/* 2. Player Registration Fee (Optional) */}
                                {(league.player_registration_fee ?? 0) > 0 && (
                                    <div className="space-y-2 pt-10 border-t border-white/20">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
                                            <ShieldCheck className="w-3 h-3" /> Player Registration
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black italic">
                                                ${league.player_registration_fee}
                                            </span>
                                            <span className="text-[10px] font-black uppercase opacity-80">
                                                Upfront Fee
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-wider opacity-60 mt-1">
                                            Paid In person at first game
                                        </p>
                                    </div>
                                )}

                                {/* 3. Player Game Fee (Standard) */}
                                <div className="space-y-2 pt-10 border-t border-white/20">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Player Game Fee
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black italic">
                                            ${isCash ? (league.cash_amount || 0) : (league.price || 0)}
                                        </span>
                                        <span className="text-[10px] font-black uppercase opacity-80">
                                            / Per Match
                                        </span>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-wider opacity-60 mt-1">
                                        Standard ongoing match cost
                                    </p>
                                </div>

                                {/* 4. Free Agent Pool Entry (If fee exists) */}
                                {(league.allow_free_agents !== false || league.free_agent_price !== null) && (league.free_agent_price ?? 0) > 0 && (
                                    <div className="space-y-2 pt-10 border-t border-white/20">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
                                            <UserPlus className="w-3 h-3" /> Free Agent Pool
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black italic">
                                                ${league.free_agent_price}
                                            </span>
                                            <span className="text-[10px] font-black uppercase opacity-80">
                                                Entry Fee
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-wider opacity-60 mt-1">
                                            Upfront registration for draft
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-12 pt-8 border-t border-white/20">
                                <p className="text-[10px] font-black uppercase leading-relaxed tracking-widest flex items-center gap-3 opacity-90">
                                    <Zap className="w-5 h-5 shrink-0" />
                                    {isCash 
                                        ? "No online transaction required. Settle directly with the facility via cash or Venmo."
                                        : "Secure online payment processed via Stripe. Instant confirmation."
                                    }
                                </p>
                            </div>
                        </section>

                        <div className="bg-white/5 border border-white/5 p-8 rounded-sm text-center">
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">Questions about this league?</p>
                            {primaryHost ? (
                                <a 
                                    href={`mailto:${primaryHost.email}?subject=${encodeURIComponent("PitchSide Support: " + league.title)}`}
                                    className="text-xs font-black text-white hover:text-blue-500 transition-colors uppercase tracking-[0.2em] border-b-2 border-blue-500 inline-block"
                                >
                                    Contact Host
                                </a>
                            ) : (
                                <Link href="/support" className="text-xs font-black text-white hover:text-blue-500 transition-colors uppercase tracking-[0.2em] border-b-2 border-blue-500">
                                    Contact Commissioner
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CRITICAL: Fixed Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-pitch-black/95 backdrop-blur-2xl border-t border-white/10 p-6 md:p-8 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
                    {isLocked ? (
                        <div className="w-full flex justify-center">
                            <div className="px-10 py-5 border border-blue-600/30 bg-blue-600/10 rounded overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                                <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-sm flex items-center justify-center gap-2">
                                    <Lock className="w-4 h-4" /> Season Locked
                                </span>
                            </div>
                        </div>
                    ) : userRole === 'free_agent' ? (
                        <div className="w-full flex flex-col gap-4">
                            <div className="w-full py-6 bg-blue-600/10 border border-blue-600/30 rounded-sm flex flex-col items-center justify-center gap-1 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <Activity className="w-5 h-5 text-blue-500" />
                                    <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-sm">Status: In Draft Pool</span>
                                </div>
                                <span className="text-[10px] text-pitch-secondary font-black uppercase tracking-widest opacity-70">Waiting for Captain Assignment</span>
                            </div>
                            <button
                                onClick={() => setIsWithdrawModalOpen(true)}
                                disabled={isPending}
                                className="w-full py-4 bg-transparent border border-red-500/30 text-red-500/70 hover:text-red-500 hover:border-red-500 hover:bg-red-500/5 transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 rounded-sm disabled:opacity-50"
                            >
                                <XCircle className="w-3 h-3" /> 
                                {isPending ? 'Processing...' : 'Withdraw from Draft Pool'}
                            </button>
                        </div>
                    ) : (userRole === 'player' || userRole === 'captain') ? (
                        <div className="w-full flex flex-col gap-4">
                            <div className="w-full py-6 bg-blue-600/10 border border-blue-600/30 rounded-sm flex flex-col items-center justify-center gap-1">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                                    <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-sm">Status: Registered</span>
                                </div>
                                <span className="text-[10px] text-pitch-secondary font-black uppercase tracking-widest opacity-70">You are registered for this league</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Link
                                href={`/leagues/${league.id}/register?type=team`}
                                className="flex-1 py-5 bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm hover:bg-white hover:text-black transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(37,99,235,0.2)] rounded-sm"
                            >
                                Register as Captain <ArrowRight className="w-4 h-4" />
                            </Link>
                            
                            {(league.allow_free_agents !== false || league.free_agent_price !== null) && (
                                <Link
                                    href={`/leagues/${league.id}/register?type=free_agent`}
                                    className="flex-1 py-5 bg-transparent border border-white/20 text-white font-black uppercase tracking-[0.2em] text-sm hover:bg-white/5 transition-all transform active:scale-95 flex items-center justify-center gap-3 rounded-sm"
                                >
                                    Join as Free Agent <ArrowRight className="w-4 h-4" />
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </div>

            <PitchSideConfirmModal 
                isOpen={isWithdrawModalOpen}
                onClose={() => setIsWithdrawModalOpen(false)}
                onConfirm={executeWithdraw}
                isProcessing={isPending}
                isDestructive={true}
                title="Withdraw from Pool"
                confirmText="Confirm Withdrawal"
                description={
                    <p>Are you sure you want to withdraw from the Free Agent pool? This will remove you from the active draft list for <span className="text-white font-bold">{league.title}</span>.</p>
                }
            />
        </div>
    );
}
