'use client';

// 🏗️ Architecture: [[RollingRegistrationClient.md]]

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowRight, AlertTriangle, Trophy, CreditCard, ScrollText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerRollingCaptain, registerRollingFreeAgent } from '@/app/actions/rolling-league-registration';
import { EmbeddedCheckoutModal } from '@/components/EmbeddedCheckoutModal';
import { supabase } from '@/lib/supabase/client';

export function RollingRegistrationClient({ 
    league,
    type 
}: { 
    league: {
        id: string;
        title: string;
        price?: number;
        team_price?: number;
        free_agent_price?: number;
        player_registration_fee?: number | null;
        cash_amount?: number | null;
        payment_collection_type?: 'stripe' | 'cash';
        rules_description?: string;
        strict_waiver_required?: boolean;
        waiver_details?: string | null;
        pass_processing_fees?: boolean | null;
        uniforms_provided?: boolean | null;
        uniform_colors?: string[] | null;
        charge_team_registration_fee?: boolean | null;
        deduct_team_reg_fee?: boolean | null;
    },
    type: 'team' | 'free_agent'
}) {
    const router = useRouter();

    // Shared State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [waiverAccepted, setWaiverAccepted] = useState(false);
    const [cashAcknowledgement, setCashAcknowledgement] = useState(false);

    // Form State
    const [teamName, setTeamName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('');
    const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

    // Payment State
    const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>('deposit');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentIntentType, setPaymentIntentType] = useState<'team' | 'free_agent'>(type);
    const [registrationId, setRegistrationId] = useState<string | null>(null);
    const [eventType, setEventType] = useState<string | null>(null);
    const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);

    const isCashLeague = league.payment_collection_type === 'cash';
    
    // EXPLICIT FEE MAPPING (Phase 2 Decoupling)
    // Registration Fee = Upfront cost requested by user
    const registrationFee = league.player_registration_fee ?? 0;
    
    // Weekly Door Fee = The cash amount collected per game
    const weeklyDoorFee = league.cash_amount ?? 0;

    // Fixed League Pricing (Stripe-based fallback)
    const upfrontLeaguePrice = type === 'team' 
        ? (league.team_price ?? 0) 
        : (league.free_agent_price ?? 0);

    // Fee Calculation
    const deductRegFee = league.deduct_team_reg_fee ?? false;
    let baseAmount = 0;
    
    if (isCashLeague) {
        baseAmount = registrationFee; // Usually cash leagues only display this as upfront
    } else {
        if (type === 'team') {
            if (paymentOption === 'deposit') {
                baseAmount = registrationFee;
            } else {
                baseAmount = deductRegFee ? upfrontLeaguePrice : upfrontLeaguePrice + registrationFee;
            }
        } else {
            baseAmount = upfrontLeaguePrice + registrationFee;
        }
    }
    
    const processingFee = (league.pass_processing_fees && baseAmount > 0 && !isCashLeague) 
        ? Number((((baseAmount + 0.30) / (1 - 0.035)) - baseAmount).toFixed(2)) 
        : 0;
    const stripeAmount = !isCashLeague ? (baseAmount + processingFee) : 0;

    const isFormValid = () => {
        const waiverValid = league.strict_waiver_required ? waiverAccepted : true;
        const cashValid = isCashLeague ? cashAcknowledgement : true;
        const positionsValid = selectedPositions.length > 0;
        const teamValid = type === 'team' ? teamName.trim().length > 0 : true;
        
        return waiverValid && cashValid && positionsValid && teamValid;
    };

    const handlePosToggle = (pos: string) => {
        setSelectedPositions(prev => 
            prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
        );
    };

    const handleRegistration = async (status: string = 'registered') => {
        setIsSubmitting(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('leagueId', league.id);
            formData.append('positions', JSON.stringify(selectedPositions));
            formData.append('status', status);
            
            if (type === 'team') {
                formData.append('teamName', teamName);
                formData.append('primaryColor', primaryColor);
                const res = await registerRollingCaptain(formData);
                if (res.success) {
                    if (status === 'registered') {
                        router.push(`/games/${league.id}`);
                        router.refresh();
                    }
                    return res;
                }
            } else {
                const res = await registerRollingFreeAgent(formData);
                if (res.success) {
                    if (status === 'registered') {
                        router.push(`/games/${league.id}`);
                        router.refresh();
                    }
                    return res;
                }
            }
        } catch (err: any) {
            setError(err.message || 'Registration failed.');
            setIsSubmitting(false);
            throw err;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid()) return;

        // Determine if payment is required upfront (Stripe)
        // (stripeAmount is already calculated above)

        if (stripeAmount > 0) {
            // Create pending first
            try {
                const res = await handleRegistration('pending');
                if (res?.registrationId) {
                    setRegistrationId(res.registrationId);
                    setEventType(res.eventType || 'rolling_league');
                    
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error("Authentication required.");

                    const checkoutRes = await fetch('/api/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            gameId: league.id,
                            userId: user.id,
                            price: stripeAmount,
                            title: league.title,
                            note: type === 'team' ? "Team Registration" : "Free Agent Registration",
                            registrationId: res.registrationId,
                            eventType: res.eventType || 'rolling_league',
                            isFreeAgent: type === 'free_agent'
                        })
                    });
                    const checkoutData = await checkoutRes.json();
                    if (checkoutData.error) throw new Error(checkoutData.error);
                    
                    setStripeClientSecret(checkoutData.clientSecret);
                    setShowPaymentModal(true);
                    setIsSubmitting(false);
                }
            } catch (err) {
                // Error handled in handleRegistration
            }
        } else {
            await handleRegistration('registered');
        }
    };

    return (
        <div className="bg-pitch-card border border-white/5 rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-pitch-accent/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                {/* Header Context */}
                <div className="mb-8 border-b border-white/10 pb-6 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 text-pitch-accent mb-4">
                        <Trophy className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                            {type === 'team' ? 'Rolling League Captain' : 'Free Agent Draft Pool'}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white leading-none">
                        {league.title}
                    </h1>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3 text-red-400">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left Column: Form Details */}
                    <div className="space-y-8">
                        {type === 'team' && (
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="teamName" className="block text-xs font-black uppercase text-gray-500 tracking-widest mb-3">The Squad Name</label>
                                    <input 
                                        id="teamName"
                                        name="teamName"
                                        type="text"
                                        required
                                        value={teamName}
                                        onChange={e => setTeamName(e.target.value)}
                                        placeholder="ENTER SQUAD NAME"
                                        className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white font-black uppercase focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="primaryColor" className="block text-xs font-black uppercase text-gray-500 tracking-widest mb-3">Primary Jersey Color</label>
                                    {league.uniforms_provided && league.uniform_colors && league.uniform_colors.length > 0 ? (
                                        <select
                                            id="primaryColor"
                                            name="primaryColor"
                                            required
                                            value={primaryColor}
                                            onChange={e => setPrimaryColor(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white font-black uppercase focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent outline-none transition-all appearance-none"
                                        >
                                            <option value="" disabled>SELECT COLOR</option>
                                            {league.uniform_colors.map(color => (
                                                <option key={color} value={color}>{color}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input 
                                            id="primaryColor"
                                            name="primaryColor"
                                            type="text"
                                            required
                                            value={primaryColor}
                                            onChange={e => setPrimaryColor(e.target.value)}
                                            placeholder="E.G. NEON VOLT / NOIR"
                                            className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white font-black uppercase focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent outline-none transition-all"
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest border-b border-white/5 pb-2">Preferred Positions</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {['Forward', 'Midfield', 'Defense', 'Goalie'].map(pos => {
                                    const isSelected = selectedPositions.includes(pos);
                                    return (
                                        <button
                                            key={pos}
                                            type="button"
                                            onClick={() => handlePosToggle(pos)}
                                            className={cn(
                                                "p-4 border rounded-sm transition-all flex items-center justify-between group",
                                                isSelected ? "bg-pitch-accent/10 border-pitch-accent" : "bg-black/20 border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", isSelected ? "text-pitch-accent" : "text-gray-400")}>{pos}</span>
                                            <div className={cn("w-2 h-2 rounded-full", isSelected ? "bg-pitch-accent shadow-[0_0_10px_rgba(204,255,0,0.5)]" : "bg-white/10")} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <RulesAndTerms 
                            description={league.rules_description}
                            strictWaiverRequired={league.strict_waiver_required}
                            waiverDetails={league.waiver_details}
                            waiverAccepted={waiverAccepted}
                            setWaiverAccepted={setWaiverAccepted}
                        />
                    </div>

                    {/* Right Column: Pricing & Confirmation */}
                    <div className="space-y-8">
                        <section className="bg-black/40 border border-white/5 p-8 rounded-sm space-y-8">
                             <div className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 tracking-widest mb-4">
                                <CreditCard className="w-4 h-4 text-pitch-accent" /> Financial Roadmap
                            </div>

                            {type === 'team' && !isCashLeague && registrationFee > 0 && (
                                <div className="space-y-3 mb-6">
                                    <label className="block text-xs font-black uppercase text-gray-400 tracking-widest">Payment Option</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentOption('deposit')}
                                            className={cn(
                                                "p-4 border rounded-sm transition-all text-left group",
                                                paymentOption === 'deposit' ? "bg-pitch-accent/10 border-pitch-accent" : "bg-black/20 border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={cn("text-[10px] font-black uppercase tracking-widest", paymentOption === 'deposit' ? "text-pitch-accent" : "text-gray-400")}>Pay Deposit</span>
                                                <div className={cn("w-2 h-2 rounded-full", paymentOption === 'deposit' ? "bg-pitch-accent shadow-[0_0_10px_rgba(204,255,0,0.5)]" : "bg-white/10")} />
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Captain pays ${registrationFee} now. Players pay remainder.</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentOption('full')}
                                            className={cn(
                                                "p-4 border rounded-sm transition-all text-left group",
                                                paymentOption === 'full' ? "bg-pitch-accent/10 border-pitch-accent" : "bg-black/20 border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={cn("text-[10px] font-black uppercase tracking-widest", paymentOption === 'full' ? "text-pitch-accent" : "text-gray-400")}>Pay Full Team</span>
                                                <div className={cn("w-2 h-2 rounded-full", paymentOption === 'full' ? "bg-pitch-accent shadow-[0_0_10px_rgba(204,255,0,0.5)]" : "bg-white/10")} />
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Cover all costs upfront.</p>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                {/* Base Amount Block */}
                                {baseAmount > 0 && (
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div className="space-y-1">
                                            <span className="block text-[10px] font-black uppercase tracking-tighter text-gray-500">
                                                {isCashLeague 
                                                    ? 'Registration Fee' 
                                                    : (type === 'team' ? (paymentOption === 'deposit' ? 'Captain Deposit' : 'Full Team Fee') : 'Registration Fee')
                                                }
                                            </span>
                                            <p className="text-xs text-pitch-accent font-bold uppercase italic tabular-nums leading-none">
                                                {isCashLeague ? 'Due At First Game (CASH)' : 'Due Today'}
                                            </p>
                                        </div>
                                        <span className="text-3xl font-black text-white italic">${baseAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {/* Processing Fee Block */}
                                {processingFee > 0 && (
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div className="space-y-1">
                                            <span className="block text-[10px] font-black uppercase tracking-tighter text-gray-500">Processing Fee</span>
                                            <p className="text-[10px] text-pitch-secondary font-bold uppercase italic leading-none">Stripe Transaction Cost</p>
                                        </div>
                                        <span className="text-xl font-black text-white italic">${processingFee.toFixed(2)}</span>
                                    </div>
                                )}

                                {/* Total Stripe Block */}
                                {stripeAmount > 0 && (
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div className="space-y-1">
                                            <span className="block text-[10px] font-black uppercase tracking-tighter text-white">Total Charge</span>
                                        </div>
                                        <span className="text-3xl font-black text-pitch-accent italic">${stripeAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {/* Weekly Door Fee Block */}
                                {weeklyDoorFee > 0 && (
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div className="space-y-1">
                                            <span className="block text-[10px] font-black uppercase tracking-tighter text-gray-500">Weekly Door Fee</span>
                                            <p className="text-xs text-pitch-secondary font-bold uppercase italic tabular-nums leading-none">DUE PER GAME (CASH)</p>
                                        </div>
                                        <span className="text-3xl font-black text-white italic">${weeklyDoorFee.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            {isCashLeague && (
                                <div className="bg-pitch-accent/5 border border-pitch-accent/20 p-6 rounded-sm">
                                    <label htmlFor="cashAcknowledgement" className="flex items-start gap-4 cursor-pointer">
                                        <input 
                                            id="cashAcknowledgement"
                                            name="cashAcknowledgement"
                                            type="checkbox" 
                                            required 
                                            checked={cashAcknowledgement}
                                            onChange={e => setCashAcknowledgement(e.target.checked)}
                                            className="mt-1 w-5 h-5 bg-black border-2 border-pitch-accent/50 rounded-sm checked:bg-pitch-accent checked:border-pitch-accent text-black focus:ring-0 focus:ring-offset-0 transition-colors"
                                        />
                                        <span className="text-[10px] text-pitch-accent font-black uppercase tracking-[0.1em] leading-relaxed">
                                            I understand that all game fees must be paid in cash at the door.
                                        </span>
                                    </label>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || !isFormValid()}
                                className="w-full py-5 bg-pitch-accent text-pitch-black font-black uppercase tracking-[0.2em] text-sm hover:bg-white transition-all transform active:scale-[0.98] rounded-sm shadow-[0_0_30px_rgba(204,255,0,0.1)] flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Processing...' : (
                                    <>
                                        {isCashLeague ? 'Finalize Registration' : 'Continue to Payment'} 
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </section>
                    </div>
                </form>
            </div>

            {showPaymentModal && stripeClientSecret && (
                 <EmbeddedCheckoutModal 
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setIsSubmitting(false);
                    }}
                    clientSecret={stripeClientSecret}
                />
            )}
        </div>
    );
}

function RulesAndTerms({ 
    description, 
    strictWaiverRequired, 
    waiverDetails, 
    waiverAccepted, 
    setWaiverAccepted 
}: { 
    description?: string | null, 
    strictWaiverRequired?: boolean, 
    waiverDetails?: string | null, 
    waiverAccepted: boolean, 
    setWaiverAccepted: (v: boolean) => void 
}) {
    if (!description && !strictWaiverRequired) return null;

    const parseMarkdown = (text: string | null) => {
        if (!text) return null;
        return text.split('\n').map((line, i) => {
            if (!line.trim()) return <br key={i} />;
            if (line.startsWith('# ')) return <h4 key={i} className="text-[10px] font-black uppercase italic text-white mt-4 first:mt-0 border-l-2 border-pitch-accent pl-2">{line.replace('# ', '')}</h4>;
            if (line.startsWith('## ')) return <h5 key={i} className="text-[9px] font-black uppercase text-pitch-accent mt-3 first:mt-0">{line.replace('## ', '')}</h5>;
            if (line.startsWith('- ')) return <div key={i} className="flex gap-2 items-start ml-1 text-[10px] text-gray-400 leading-relaxed"><div className="w-1 h-1 bg-pitch-accent rounded-full mt-1.5 shrink-0" /><span>{line.replace('- ', '')}</span></div>;
            return <p key={i} className="text-gray-400 text-[10px] leading-relaxed italic">{line}</p>;
        });
    };

    return (
        <div className="space-y-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-[10px]">
                <ScrollText className="w-4 h-4 text-pitch-accent" />
                Rules & Terms
            </div>

            <div className="grid grid-cols-1 gap-6">
                {description && (
                    <div className="bg-black/40 border border-white/5 p-6 rounded-sm max-h-[200px] overflow-y-auto custom-scrollbar">
                        <div className="space-y-3">{parseMarkdown(description)}</div>
                    </div>
                )}
                
                {strictWaiverRequired && (
                    <div className="space-y-4">
                        <div className="bg-black/40 border border-white/5 p-6 rounded-sm max-h-[200px] overflow-y-auto custom-scrollbar italic text-[10px] text-gray-500 whitespace-pre-wrap">
                            {waiverDetails || "Standard liability waiver apply."}
                        </div>
                        <div className="mt-6 p-4 bg-pitch-accent/5 border border-pitch-accent/20 rounded-sm">
                            <label htmlFor="waiverAccepted" className="flex items-center gap-4 cursor-pointer group">
                                <div className="relative flex items-center justify-center">
                                    <input 
                                        id="waiverAccepted"
                                        name="waiverAccepted"
                                        type="checkbox" 
                                        required
                                        checked={waiverAccepted}
                                        onChange={e => setWaiverAccepted(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-6 h-6 border-2 border-pitch-accent/30 rounded flex items-center justify-center peer-checked:bg-pitch-accent peer-checked:border-pitch-accent transition-all group-hover:border-pitch-accent/60">
                                        <svg className="w-4 h-4 text-pitch-black font-black scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-[11px] font-black text-pitch-accent group-hover:text-white uppercase tracking-[0.1em] transition-colors select-none">
                                    I have read and agree to the event terms
                                </span>
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
