'use client';

// 🏗️ Architecture: [[RollingRegistrationClient.md]]

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowRight, AlertTriangle, Trophy, CreditCard, ScrollText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerRollingCaptain, registerRollingFreeAgent } from '@/app/actions/rolling-league-registration';
import { StripeCheckoutModal } from '@/components/public/StripeCheckoutModal';

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
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentIntentType, setPaymentIntentType] = useState<'team' | 'free_agent'>(type);

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

    const handleRegistration = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('leagueId', league.id);
            formData.append('positions', JSON.stringify(selectedPositions));
            
            if (type === 'team') {
                formData.append('teamName', teamName);
                formData.append('primaryColor', primaryColor);
                const res = await registerRollingCaptain(formData);
                if (res.success) {
                    router.push(`/games/${league.id}`);
                    router.refresh();
                }
            } else {
                const res = await registerRollingFreeAgent(formData);
                if (res.success) {
                    router.push(`/games/${league.id}`);
                    router.refresh();
                }
            }
        } catch (err: any) {
            setError(err.message || 'Registration failed.');
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid()) return;

        // Determine if payment is required upfront (Stripe)
        const stripeAmount = !isCashLeague ? (upfrontLeaguePrice + registrationFee) : 0;

        if (stripeAmount > 0) {
            setShowPaymentModal(true);
        } else {
            await handleRegistration();
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
                                    <label className="block text-xs font-black uppercase text-gray-500 tracking-widest mb-3">The Squad Name</label>
                                    <input 
                                        type="text"
                                        required
                                        value={teamName}
                                        onChange={e => setTeamName(e.target.value)}
                                        placeholder="ENTER SQUAD NAME"
                                        className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white font-black uppercase focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-500 tracking-widest mb-3">Primary Jersey Color</label>
                                    <input 
                                        type="text"
                                        value={primaryColor}
                                        onChange={e => setPrimaryColor(e.target.value)}
                                        placeholder="E.G. NEON VOLT / NOIR"
                                        className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white font-black uppercase focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent outline-none transition-all"
                                    />
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

                            <div className="space-y-6">
                                {/* Registration Fee Block */}
                                {registrationFee > 0 && (
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div className="space-y-1">
                                            <span className="block text-[10px] font-black uppercase tracking-tighter text-gray-500">Registration Fee</span>
                                            <p className="text-xs text-pitch-accent font-bold uppercase italic tabular-nums leading-none">Due At First Game (CASH)</p>
                                        </div>
                                        <span className="text-3xl font-black text-white italic">${registrationFee}</span>
                                    </div>
                                )}

                                {/* Weekly Door Fee Block */}
                                {weeklyDoorFee > 0 && (
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div className="space-y-1">
                                            <span className="block text-[10px] font-black uppercase tracking-tighter text-gray-500">Weekly Door Fee</span>
                                            <p className="text-xs text-pitch-secondary font-bold uppercase italic tabular-nums leading-none">DUE PER GAME (CASH)</p>
                                        </div>
                                        <span className="text-3xl font-black text-white italic">${weeklyDoorFee}</span>
                                    </div>
                                )}
                            </div>

                            {isCashLeague && (
                                <div className="bg-pitch-accent/5 border border-pitch-accent/20 p-6 rounded-sm">
                                    <label className="flex items-start gap-4 cursor-pointer">
                                        <input 
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

            {showPaymentModal && registrationFee > 0 && (
                 <StripeCheckoutModal 
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setIsSubmitting(false);
                    }}
                    amount={registrationFee}
                    title="League Registration"
                    description={`Initial registration for ${league.title}`}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        handleRegistration();
                    }}
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
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <div className="relative flex items-center justify-center">
                                    <input 
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
