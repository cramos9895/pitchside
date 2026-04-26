'use client';

import React from 'react';
import { 
    Calendar, MapPin, Clock, DollarSign, Trophy, Shield, 
    Activity, Layers, ArrowRight, ScrollText, Zap, Footprints,
    XCircle, ShieldCheck, UserPlus, Users, Crown, Lock
} from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { withdrawFromRollingLeague } from '@/app/actions/rolling-league-registration';
import { PitchSideConfirmModal } from './PitchSideConfirmModal';
import { isLeagueLocked } from '@/lib/league-utils';

interface RollingLeague {
    id: string;
    title: string;
    location_name?: string;
    location: string;
    location_nickname?: string;
    start_time: string;
    description?: string;
    
    // Financials
    payment_collection_type?: 'stripe' | 'cash';
    cash_amount?: number;
    cash_fee_structure?: string;
    team_price?: number;
    team_registration_fee?: number;
    price?: number;
    allow_free_agents?: boolean;
    free_agent_price?: number;

    // Specs
    game_format_type?: string;
    field_size?: string;
    total_game_time?: number;
    shoe_types?: string[];
    surface_type?: string;
    match_style?: string;

    // Rules
    waiver_details?: string;
    prize_type?: string;
    reward?: string;
    fixed_prize_amount?: number;
    prize_pool_percentage?: number;
    half_length?: number;
    field_type?: string;
    player_registration_fee?: number;
}

interface RollingFreeAgentViewProps {
    game: RollingLeague;
    primaryHost?: { name: string; email: string } | null;
    registeredTeams?: any[];
}

export function RollingFreeAgentView({ game, primaryHost, registeredTeams = [] }: RollingFreeAgentViewProps) {
    const [isPending, startTransition] = useTransition();
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

    const executeWithdraw = () => {
        startTransition(async () => {
            try {
                await withdrawFromRollingLeague(game.id);
                setIsWithdrawModalOpen(false);
                // Force reload to re-evaluate Smart Bouncer logic and return to signup lobby
                window.location.reload();
            } catch (err) {
                console.error("Failed to withdraw:", err);
                setIsWithdrawModalOpen(false);
            }
        });
    };

    const isLocked = isLeagueLocked(game);
    const isCash = game.payment_collection_type === 'cash';
    
    const gameDate = new Date(game.start_time);
    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const getPrizeDisplay = () => {
        const type = game.prize_type?.toLowerCase();
        
        // Handle descriptive strings from GameForm
        if (!game.prize_type || type?.includes('no official') || type === 'none') return 'Bragging Rights';
        if (type?.includes('percentage pool') || type === 'pool') return `${game.prize_pool_percentage}% Pool`;
        if (type?.includes('fixed cash bounty') || type === 'fixed') return `$${game.fixed_prize_amount} Bounty`;
        if (type?.includes('physical item') || type === 'physical') return game.reward || 'Trophy';
        
        return 'Competitive Glory';
    };

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pb-40 relative overflow-x-hidden">
            {/* Glossy Header Background */}
            <div className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-pitch-accent/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="max-w-6xl mx-auto px-6 pt-16 relative z-10">
                {/* Hero Sales Pitch Section */}
                <div className="mb-20 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8">
                        <div className="bg-pitch-accent text-pitch-black text-[10px] font-black px-3 py-1 rounded uppercase tracking-[0.2em]">
                            Rolling League
                        </div>
                        {isCash && (
                            <div className="bg-orange-500/20 text-orange-400 text-[10px] font-black px-3 py-1 rounded border border-orange-500/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Zap className="w-3 h-3" /> Pay at Field
                            </div>
                        )}
                    </div>
                    
                    <h1 className="text-7xl md:text-[10rem] font-black italic uppercase tracking-tighter text-white leading-[0.75] mb-12 drop-shadow-2xl">
                        {game.title}
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
                                {game.location_nickname || game.location_name || game.location.split(',')[0]}
                            </p>
                        </div>
                        {primaryHost && (
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] block">
                                    League Host
                                </span>
                                <div className="flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-pitch-accent" />
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
                             <div className="absolute top-0 right-0 w-64 h-64 bg-pitch-accent/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                            
                            <h3 className="font-heading text-2xl font-black italic uppercase mb-12 flex items-center gap-3 text-pitch-accent">
                                <Shield className="w-6 h-6" /> League Specs
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                                {/* Row 1 */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-pitch-accent" /> Match Format
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">{game.game_format_type || 'League Standard'}</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-pitch-accent" /> Field Size
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">
                                        {game.field_size || 'Standard'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-pitch-accent" /> Surface Type
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">
                                        {game.surface_type || 'Turf'}
                                    </p>
                                </div>

                                {/* Row 2 */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-pitch-accent" /> Half Length
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">
                                        {game.half_length || '0'} Min
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-pitch-accent" /> Total Game Time
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">
                                        {(game.half_length || 0) * 2} Min
                                    </p>
                                </div>
                                
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-pitch-accent" /> Match Style
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic">{game.match_style || 'Standard'}</p>
                                </div>

                                {/* Row 3 */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Footprints className="w-4 h-4 text-pitch-accent" /> Shoe Types
                                    </span>
                                    <p className="text-lg font-bold text-white uppercase italic truncate">
                                        {game.shoe_types?.join(' / ') || 'Cleats / Turf'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-pitch-accent" /> Grand Prize
                                    </span>
                                    <p className="text-lg font-bold text-[#ccff00] uppercase italic">{getPrizeDisplay()}</p>
                                </div>
                            </div>
                        </section>

                        <section className="bg-pitch-card border border-white/5 p-10 rounded-sm">
                            <h3 className="font-heading text-2xl font-black italic uppercase mb-8 flex items-center gap-3 text-white">
                                <ScrollText className="w-6 h-6 text-pitch-accent" /> Terms & Rules
                            </h3>
                            <div className="bg-black/40 border border-white/10 p-8 rounded-sm text-sm text-gray-400 leading-relaxed font-medium whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar italic tracking-wide">
                                {game.waiver_details || "Players must adhere to the facility rules. No dangerous play allowed. Respect the referee decision. All registrations are final once the season begins."}
                            </div>
                        </section>

                        <section className="bg-pitch-card border border-white/5 p-10 rounded-sm">
                            <h3 className="font-heading text-2xl font-black italic uppercase mb-8 flex items-center gap-3 text-white">
                                <Users className="w-6 h-6 text-pitch-accent" /> Competing Squads
                            </h3>
                            
                            {!registeredTeams || registeredTeams.length === 0 ? (
                                <div className="bg-black/40 border border-white/10 p-12 rounded-sm text-center">
                                    <p className="text-pitch-secondary font-bold uppercase italic tracking-widest text-sm mb-2">No squads have entered the arena yet</p>
                                    <p className="text-gray-500 text-xs uppercase tracking-widest">Be the first to plant your flag.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {registeredTeams.map((team) => (
                                        <div key={team.id} className="bg-black/40 border border-white/5 p-6 rounded-sm space-y-4">
                                            <div className="flex justify-between items-start text-left">
                                                <div>
                                                    <h4 className="text-xl font-bold text-white uppercase italic">{team.name}</h4>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Led by {team.captain_name}</p>
                                                </div>
                                                <div className="bg-white/5 px-2 py-1 rounded text-[10px] font-black text-white uppercase tracking-widest shrink-0">
                                                    {team.player_count} Players
                                                </div>
                                            </div>
                                            
                                            {team.accepting_free_agents && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-pitch-accent/10 border border-pitch-accent/20 rounded-full w-fit">
                                                    <UserPlus className="w-3 h-3 text-pitch-accent" />
                                                    <span className="text-[9px] font-black text-pitch-accent uppercase tracking-widest">Recruiting Free Agents</span>
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
                        <section className="bg-pitch-accent text-pitch-black p-10 rounded-sm relative shadow-[0_0_50px_rgba(204,255,0,0.1)]">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-10 border-b border-black/10 pb-4">
                                Season Pricing
                            </h3>
                            
                            <div className="space-y-10">
                                {/* 1. Team Registration Fee */}
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                        <Users className="w-3 h-3" /> Team Registration
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black italic">
                                            ${game.team_registration_fee || 0}
                                        </span>
                                        <span className="text-[10px] font-black uppercase opacity-60">
                                            Upfront Entry
                                        </span>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-1">
                                        Per Team Registration Fee
                                    </p>
                                </div>

                                {/* 2. Player Registration Fee (Optional) */}
                                {(game.player_registration_fee ?? 0) > 0 && (
                                    <div className="space-y-2 pt-10 border-t border-black/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                            <ShieldCheck className="w-3 h-3" /> Player Registration
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black italic">
                                                ${game.player_registration_fee}
                                            </span>
                                            <span className="text-[10px] font-black uppercase opacity-60">
                                                Upfront Fee
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-1">
                                            Paid In person at first game
                                        </p>
                                    </div>
                                )}

                                {/* 3. Player Game Fee (Standard) */}
                                <div className="space-y-2 pt-10 border-t border-black/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Player Game Fee
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black italic">
                                            ${isCash ? (game.cash_amount || 0) : (game.price || 0)}
                                        </span>
                                        <span className="text-[10px] font-black uppercase opacity-60">
                                            / Per Match
                                        </span>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-1">
                                        Standard ongoing match cost
                                    </p>
                                </div>

                                {/* 4. Free Agent Pool Entry (If fee exists) */}
                                {game.allow_free_agents && (game.free_agent_price ?? 0) > 0 && (
                                    <div className="space-y-2 pt-10 border-t border-black/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                            <UserPlus className="w-3 h-3" /> Free Agent Pool
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black italic">
                                                ${game.free_agent_price}
                                            </span>
                                            <span className="text-[10px] font-black uppercase opacity-60">
                                                Entry Fee
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-1">
                                            Upfront registration for draft
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-12 pt-8 border-t border-black/10">
                                <p className="text-[10px] font-black uppercase leading-relaxed tracking-widest flex items-center gap-3">
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
                                    href={`mailto:${primaryHost.email}?subject=${encodeURIComponent("PitchSide Support: " + game.title)}`}
                                    className="text-xs font-black text-white hover:text-pitch-accent transition-colors uppercase tracking-[0.2em] border-b-2 border-pitch-accent inline-block"
                                >
                                    Contact Host
                                </a>
                            ) : (
                                <Link href="/support" className="text-xs font-black text-white hover:text-pitch-accent transition-colors uppercase tracking-[0.2em] border-b-2 border-pitch-accent">
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
                            <div className="px-10 py-5 border border-pitch-accent/30 bg-pitch-accent/10 rounded overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#cbff00]" />
                                <span className="text-pitch-accent font-black uppercase tracking-[0.3em] text-sm flex items-center justify-center gap-2">
                                    <Lock className="w-4 h-4" /> Season Locked
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col gap-4">
                            <div className="w-full py-6 bg-pitch-accent/10 border border-pitch-accent/30 rounded-sm flex flex-col items-center justify-center gap-1 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <Activity className="w-5 h-5 text-pitch-accent" />
                                    <span className="text-pitch-accent font-black uppercase tracking-[0.3em] text-sm">Status: In Draft Pool</span>
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
                    <p>Are you sure you want to withdraw from the Free Agent pool? This will remove you from the active draft list for <span className="text-white font-bold">{game.title}</span>.</p>
                }
            />
        </div>
    );
}
