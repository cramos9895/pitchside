'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckCircle2, Trophy, ArrowRight, ShieldCheck, Info, Loader2, CreditCard, Lock } from 'lucide-react';
import { acceptTeamInvite } from '@/app/actions/invite-actions';
import { createSetupIntent } from '@/app/actions/stripe-payment';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

interface InviteClientProps {
    teamId: string;
    teamName: string;
    tournamentId: string;
    tournamentName: string;
    totalFee: number;
    rosterCount: number;
    isFullPay: boolean;
    captainName: string;
    minPlayers: number;
    maxPlayers: number;
}

export function InviteClient({ teamId, teamName, tournamentId, tournamentName, totalFee, rosterCount, isFullPay, captainName, minPlayers, maxPlayers }: InviteClientProps) {
    const router = useRouter();
    const [waiverAccepted, setWaiverAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [setupIntentId, setSetupIntentId] = useState<string | null>(null);

    const minSplit = (totalFee / (maxPlayers || 12)).toFixed(2);
    const maxSplit = (totalFee / (minPlayers || 5)).toFixed(2);

    useEffect(() => {
        if (!isFullPay && totalFee > 0) {
            createSetupIntent().then(res => {
                setClientSecret(res.clientSecret);
                setSetupIntentId(res.id);
            });
        }
    }, [isFullPay, totalFee]);

    const handleFreeJoin = async () => {
        if (!waiverAccepted) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await acceptTeamInvite({
                teamId,
                tournamentId,
                waiverAccepted: true
            });
            if (res.success) router.push('/dashboard?success=team-joined');
        } catch (err: any) {
            setError(err.message || 'Failed to join team.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-pitch-card border border-white/5 rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pitch-accent/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                <div className="mb-8 border-b border-white/10 pb-6 uppercase">
                    <div className="flex items-center gap-3 text-pitch-accent mb-2">
                        <Trophy className="w-5 h-5" />
                        <span className="text-[10px] font-black tracking-[0.2em]">Official Invitation</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white leading-[0.85] mb-4">
                        Join {teamName}
                    </h1>
                    <p className="text-pitch-secondary text-sm font-bold tracking-widest">
                        Invited by <span className="text-pitch-accent">{captainName}</span> for {tournamentName}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3 text-red-400">
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
                    </div>
                )}

                <div className="space-y-8">
                    {/* The Notice */}
                    <div className="p-6 bg-white/5 rounded-xl border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 text-white">
                            <Info className="w-5 h-5 text-pitch-accent" />
                            <span className="font-black uppercase tracking-widest text-sm">Team Roster Guidelines</span>
                        </div>
                        <p className="text-gray-400 text-sm font-medium leading-relaxed">
                            {isFullPay 
                                ? "Your captain has covered the team entry fee in full. You can join the roster immediately after accepting the liability waiver."
                                : `This team is using Split-Pay. Each rostered player will cover an equal portion of the team fee of $${totalFee}.`}
                        </p>
                        
                        {!isFullPay && totalFee > 0 && (
                            <div className="mt-4 p-4 bg-pitch-accent/10 border border-pitch-accent/30 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-black uppercase text-pitch-accent tracking-widest">Est. Split Range</span>
                                    <span className="text-xl font-black text-white">${minSplit} - ${maxSplit}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em] mt-1">
                                    Based on a roster of {minPlayers}-{maxPlayers} players.
                                </p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em] mt-2 italic">
                                    This is an estimate. Your final cost will be determined by the final roster size. Please check with your captain {captainName} for more details.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* The Liability Trap */}
                    <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <div className="relative flex items-center justify-center mt-1">
                                <input 
                                    type="checkbox" 
                                    checked={waiverAccepted}
                                    onChange={(e) => setWaiverAccepted(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-6 h-6 border-2 border-orange-500/40 rounded flex items-center justify-center peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-colors">
                                    <svg className="w-4 h-4 text-pitch-black font-bold scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex-1">
                                <span className="block text-sm font-bold uppercase tracking-wider text-orange-400 mb-1">Liability Waiver</span>
                                <p className="text-xs text-orange-400/70 font-medium leading-relaxed">
                                    I agree to the Pitchside liability waiver and understand my participation requires full compliance with event rules.
                                </p>
                            </div>
                        </label>
                    </div>

                    {isFullPay || totalFee === 0 ? (
                        <button 
                            onClick={handleFreeJoin}
                            disabled={!waiverAccepted || isSubmitting}
                            className="w-full py-5 bg-pitch-accent text-pitch-black font-black uppercase tracking-[0.2em] hover:bg-white transition-all transform active:scale-[0.98] rounded-lg shadow-[0_0_30px_rgba(204,255,0,0.15)] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Accept & Join <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    ) : (
                        <div className="space-y-6">
                            {clientSecret ? (
                                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#cbff00', colorBackground: '#1a1a1a', colorText: '#ffffff' } } }}>
                                    <SetupIntentForm 
                                        teamId={teamId}
                                        tournamentId={tournamentId}
                                        setupIntentId={setupIntentId!} 
                                        waiverAccepted={waiverAccepted}
                                        onError={(msg) => setError(msg)}
                                    />
                                </Elements>
                            ) : (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-pitch-accent" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SetupIntentForm({ teamId, tournamentId, setupIntentId, waiverAccepted, onError }: { teamId: string, tournamentId: string, setupIntentId: string, waiverAccepted: boolean, onError: (msg: string) => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements || !waiverAccepted) return;

        setIsProcessing(true);
        const { error, setupIntent } = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: window.location.href,
            },
            redirect: 'if_required',
        });

        if (error) {
            onError(error.message || 'Verification failed.');
            setIsProcessing(false);
        } else if (setupIntent && setupIntent.status === 'succeeded') {
            try {
                const res = await acceptTeamInvite({
                    teamId,
                    tournamentId,
                    setupIntentId,
                    waiverAccepted: true
                });
                if (res.success) router.push('/dashboard?success=team-joined');
            } catch (err: any) {
                onError(err.message || 'Failed to register.');
                setIsProcessing(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />
            <button
                type="submit"
                disabled={!stripe || !waiverAccepted || isProcessing}
                className="w-full py-5 bg-pitch-accent text-pitch-black font-black uppercase tracking-[0.2em] hover:bg-white transition-all transform active:scale-[0.98] rounded-lg shadow-[0_0_30px_rgba(204,255,0,0.15)] flex items-center justify-center gap-3 disabled:opacity-50"
            >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                        <Lock className="w-4 h-4" /> Authorize Card
                    </>
                )}
            </button>
            <p className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500" /> SECURE AUTH VIA STRIPE
            </p>
        </form>
    );
}
