'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowRight, AlertTriangle, CheckCircle2, Trophy, CreditCard } from 'lucide-react';
import { registerTournamentTeam, registerTournamentFreeAgent } from '@/app/actions/tournament-registration';
import { StripeCheckoutModal } from '@/components/public/StripeCheckoutModal';

export function TournamentRegistrationClient({ 
    tournamentId, 
    tournamentName, 
    teamPrice, 
    faPrice,
    dbDepositAmount 
}: { 
    tournamentId: string, 
    tournamentName: string, 
    teamPrice: number | null, 
    faPrice: number | null,
    dbDepositAmount: number | null
}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const type = searchParams.get('type');

    // Shared State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Payment State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [savedFormData, setSavedFormData] = useState<any>(null);
    const [paymentIntentType, setPaymentIntentType] = useState<'team' | 'free_agent'>('team');

    const depositAmount = dbDepositAmount !== null 
        ? dbDepositAmount 
        : (teamPrice ? Math.min(50, teamPrice) : 0);

    const finalizeTeamRegistration = async (payload: any) => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
                formData.append(key, value as string);
            });
            formData.append('tournament_id', tournamentId);
            
            const res = await registerTournamentTeam(formData);
            if (res.success && res.teamId) {
                router.push(`/tournaments/${tournamentId}/team/${res.teamId}`);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to register team.');
            setIsSubmitting(false);
        }
    };

    const handleTeamSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const formData = new FormData(e.currentTarget);
            const payload = {
                team_name: formData.get('team_name'),
                primary_color: formData.get('primary_color'),
                liability_acknowledged: formData.get('liability_acknowledged')
            };
            
            // Add liability trap validation manually in client for UX, though server checks too
            if (!payload.liability_acknowledged) {
                throw new Error("You must accept financial responsibility.");
            }

            if (depositAmount > 0) {
                setPaymentIntentType('team');
                setSavedFormData(payload);
                setShowPaymentModal(true);
                setIsSubmitting(false);
            } else {
                await finalizeTeamRegistration(payload);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to process team request.');
            setIsSubmitting(false);
        }
    };

    const finalizeFARegistration = async (payload: any) => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('tournament_id', tournamentId);
            if (Array.isArray(payload.positions)) {
                payload.positions.forEach((pos: string) => formData.append('positions', pos));
            }

            const res = await registerTournamentFreeAgent(formData);
            if (res.success) {
                router.push('/dashboard?success=free-agent-registered');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to register as free agent.');
            setIsSubmitting(false);
        }
    };

    const handleFASubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const formData = new FormData(e.currentTarget);
            const positions = formData.getAll('positions');
            
            if (positions.length === 0) {
                throw new Error("Please select at least one preferred position.");
            }

            const payload = {
                positions: positions
            };

            if (faPrice !== null && faPrice > 0) {
                setPaymentIntentType('free_agent');
                setSavedFormData(payload);
                setShowPaymentModal(true);
                setIsSubmitting(false);
            } else {
                await finalizeFARegistration(payload);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to process free agent request.');
            setIsSubmitting(false);
        }
    };

    if (type !== 'team' && type !== 'free_agent') {
        return (
            <div className="text-center p-12 bg-black/50 border border-white/10 rounded-xl">
                <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Invalid Setup</h2>
                <p className="text-gray-400 font-medium">Please return to the schedule hub and select a valid registration type.</p>
                <button onClick={() => router.push('/schedule')} className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 rounded font-bold uppercase tracking-widest text-xs transition-colors">Return to Hub</button>
            </div>
        );
    }

    return (
        <div className="bg-pitch-card border border-white/5 rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pitch-accent/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                <div className="mb-8 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-3 text-pitch-accent mb-2">
                        <Trophy className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{type === 'team' ? 'Captain Registration' : 'Free Agent Draft Pool'}</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-[0.85]">
                        {tournamentName}
                    </h1>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3 text-red-400">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
                    </div>
                )}

                {type === 'team' ? (
                    <form onSubmit={handleTeamSubmit} className="space-y-8">
                        {/* Team Details */}
                        <div className="space-y-6 bg-black/30 p-6 rounded-xl border border-white/5">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-white/10 pb-2">The Squad</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="team_name" className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Team Name *</label>
                                    <input 
                                        type="text" 
                                        id="team_name" 
                                        name="team_name" 
                                        required 
                                        placeholder="e.g. The Pitchside Invincibles"
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors block font-bold"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="primary_color" className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Primary Jersey Color</label>
                                    <input 
                                        type="text" 
                                        id="primary_color" 
                                        name="primary_color" 
                                        placeholder="e.g. Neon Green"
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors block"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payment Strategy */}
                        <div className="space-y-6 bg-black/30 p-6 rounded-xl border border-white/5">
                            <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" /> Entry Strategy
                                </h3>
                                <span className="text-xl font-black text-white">${teamPrice || 0}</span>
                            </div>

                            <div className="p-4 rounded-xl border bg-pitch-accent/10 border-pitch-accent text-pitch-accent shadow-[0_0_20px_rgba(204,255,0,0.1)] relative overflow-hidden flex justify-between items-center">
                                <div>
                                    <span className="block text-xs font-black uppercase tracking-widest mb-1">Deposit Required: ${depositAmount}</span>
                                    <span className="block text-[10px] uppercase font-bold tracking-widest opacity-80 mt-1">Settle full balance via Captain's Dashboard</span>
                                </div>
                                <CheckCircle2 className="w-6 h-6 shrink-0" />
                            </div>

                            {/* The Liability Trap */}
                            <div className="mt-6 p-4 bg-orange-500/5 border border-orange-500/30 rounded-lg animate-in fade-in slide-in-from-top-4 duration-300">
                                <label className="flex items-start gap-4 cursor-pointer group">
                                    <div className="relative flex items-center justify-center mt-1">
                                        <input 
                                            type="checkbox" 
                                            name="liability_acknowledged" 
                                            required 
                                            className="sr-only peer"
                                        />
                                        <div className="w-6 h-6 border-2 border-orange-500/50 rounded flex items-center justify-center peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-colors">
                                            <svg className="w-4 h-4 text-pitch-black font-bold scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <span className="block text-sm font-bold uppercase tracking-wider text-orange-400 mb-1">Captain's Liability Agreement</span>
                                        <p className="text-xs text-orange-400/70 font-medium leading-relaxed">
                                            I understand I am financially responsible for any remaining balance by the roster lock date. My card on file will be charged the difference.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full py-5 bg-pitch-accent text-pitch-black font-black uppercase tracking-[0.2em] hover:bg-white transition-all transform active:scale-[0.98] rounded-lg shadow-[0_0_30px_rgba(204,255,0,0.15)] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Processing...' : (
                                <>Secure Team Spot <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleFASubmit} className="space-y-8">
                        <div className="space-y-6 bg-black/30 p-6 rounded-xl border border-white/5">
                            <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Position Preferences</h3>
                                <span className="text-xl font-black text-pitch-accent">${faPrice !== null ? faPrice : 0}</span>
                            </div>
                            
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Select all regions of the pitch you operate in:</p>
                            
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                {['Forward', 'Midfield', 'Defense', 'Goalie'].map(pos => (
                                    <label key={pos} className="flex items-center gap-3 cursor-pointer group bg-black/40 p-3 rounded border border-white/5 hover:border-pitch-accent/40 transition-colors">
                                        <div className="relative flex items-center justify-center">
                                            <input type="checkbox" name="positions" value={pos} className="sr-only peer" />
                                            <div className="w-5 h-5 border-2 border-white/20 rounded flex items-center justify-center peer-checked:bg-pitch-accent peer-checked:border-pitch-accent transition-colors">
                                                <svg className="w-3 h-3 text-pitch-black font-bold scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold uppercase tracking-widest text-gray-300 group-hover:text-white transition-colors">{pos}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full py-5 bg-pitch-accent text-pitch-black font-black uppercase tracking-[0.2em] hover:bg-white transition-all transform active:scale-[0.98] rounded-lg shadow-[0_0_30px_rgba(204,255,0,0.15)] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Processing...' : (
                                <>Enter Draft Pool <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </form>
                )}
            </div>

            {/* Embedded Stripe Checkout */}
            {showPaymentModal && (paymentIntentType === 'team' ? depositAmount > 0 : (faPrice !== null && faPrice > 0)) && (
                <StripeCheckoutModal 
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setIsSubmitting(false);
                    }}
                    amount={paymentIntentType === 'team' ? depositAmount : (faPrice || 0)}
                    title={paymentIntentType === 'team' ? "Team Deposit Reservation" : "Free Agent Registration"}
                    description={paymentIntentType === 'team' ? `Secure your spot in ${tournamentName}` : `Join the draft pool for ${tournamentName}`}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        if (savedFormData) {
                            if (paymentIntentType === 'team') {
                                finalizeTeamRegistration(savedFormData);
                            } else {
                                finalizeFARegistration(savedFormData);
                            }
                        }
                    }}
                />
            )}
        </div>
    );
}
