'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowRight, AlertTriangle, CheckCircle2, Trophy, CreditCard, ScrollText, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerTournamentTeam, registerTournamentFreeAgent } from '@/app/actions/tournament-registration';
import { StripeCheckoutModal } from '@/components/public/StripeCheckoutModal';

export function TournamentRegistrationClient({ 
    tournamentId, 
    tournamentName, 
    teamPrice, 
    faPrice,
    dbDepositAmount,
    signup_fee,
    cash_amount,
    payment_collection_type,
    description,
    strict_waiver_required,
    waiver_details
}: { 
    tournamentId: string, 
    tournamentName: string, 
    teamPrice: number | null, 
    faPrice: number | null,
    dbDepositAmount: number | null,
    signup_fee?: number | null,
    cash_amount?: number | null,
    payment_collection_type?: 'stripe' | 'cash',
    description?: string | null,
    strict_waiver_required?: boolean,
    waiver_details?: string | null
}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const type = searchParams.get('type');

    // Shared State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [waiverAccepted, setWaiverAccepted] = useState(false);
    const [cashAcknowledgement, setCashAcknowledgement] = useState(false);

    // Payment State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [savedFormData, setSavedFormData] = useState<any>(null);
    const [paymentIntentType, setPaymentIntentType] = useState<'team' | 'free_agent'>('team');

    const isCashLeague = payment_collection_type === 'cash';
    const registrationFee = signup_fee ?? 0;
    const perGameFee = isCashLeague ? (faPrice ?? cash_amount ?? 0) : 0;

    const depositAmount = dbDepositAmount !== null 
        ? dbDepositAmount 
        : (teamPrice ? Math.min(50, teamPrice) : 0);

    const isFormValid = () => {
        const waiverValid = strict_waiver_required ? waiverAccepted : true;
        const cashValid = isCashLeague ? cashAcknowledgement : true;
        return waiverValid && cashValid;
    };

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
        if (!isFormValid()) return;

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

            if (depositAmount > 0 && !isCashLeague) {
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
                router.push(`/tournaments/${tournamentId}`);
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to register as free agent.');
            setIsSubmitting(false);
        }
    };

    const handleFASubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isFormValid()) return;

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

            const faTotalOnlinePrice = (!isCashLeague && faPrice) ? faPrice : 0;

            if (faTotalOnlinePrice > 0) {
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
                                        placeholder="ENTER TEAM NAME"
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors block font-bold uppercase"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="primary_color" className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Primary Jersey Color</label>
                                    <input 
                                        type="text" 
                                        id="primary_color" 
                                        name="primary_color" 
                                        placeholder="e.g. RED / WHITE / BLACK"
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors block uppercase"
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
                                    <span className="block text-xs font-black uppercase tracking-widest mb-1">{isCashLeague ? 'Register Full Team (Cash)' : `Deposit Required: $${depositAmount}`}</span>
                                    <span className="block text-[10px] uppercase font-bold tracking-widest opacity-80 mt-1">{isCashLeague ? 'All fees collected in-person' : "Settle full balance via Captain's Dashboard"}</span>
                                </div>
                                <CheckCircle2 className="w-6 h-6 shrink-0" />
                            </div>

                            {!isCashLeague && (
                                <div className="mt-6 p-4 bg-orange-500/5 border border-orange-500/30 rounded-lg">
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
                                                I understand I am financially responsible for any remaining balance.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {isCashLeague && (
                                <div className="mt-6 p-4 bg-pitch-accent/5 border border-pitch-accent/20 rounded-lg">
                                    <label className="flex items-start gap-4 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            required
                                            checked={cashAcknowledgement}
                                            onChange={e => setCashAcknowledgement(e.target.checked)}
                                            className="mt-1 w-5 h-5 bg-black border-2 border-pitch-accent/50 rounded-sm checked:bg-pitch-accent checked:border-pitch-accent text-black focus:ring-0 focus:ring-offset-0 transition-colors"
                                        />
                                        <span className="text-xs text-pitch-accent font-bold uppercase tracking-wider leading-relaxed">
                                            I understand that all league fees must be paid in cash at the door.
                                        </span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Rules & terms */}
                        <RulesAndTerms 
                            description={description}
                            strictWaiverRequired={strict_waiver_required}
                            waiverDetails={waiver_details}
                            waiverAccepted={waiverAccepted}
                            setWaiverAccepted={setWaiverAccepted}
                        />

                        <button 
                            type="submit" 
                            disabled={isSubmitting || !isFormValid()}
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
                                <div className="text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        {/* 1. Registration Fee (Signup) */}
                                        {registrationFee > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Registration fee:</span>
                                                <span className="text-xl font-black text-pitch-accent leading-none">
                                                    ${registrationFee} 
                                                    <span className="text-[10px] text-gray-500 not-italic ml-1 uppercase tracking-tighter">({isCashLeague ? 'At First Game' : 'Includes Credit'})</span>
                                                </span>
                                            </div>
                                        )}

                                        {/* 2. Free Agent League Fee OR Per Game Fee */}
                                        {faPrice !== null ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Free Agent League Fee:</span>
                                                <span className="text-xl font-black text-white leading-none">
                                                    ${faPrice}
                                                    {isCashLeague && <span className="text-[10px] text-gray-500 not-italic ml-1 uppercase tracking-tighter">(In-Person)</span>}
                                                </span>
                                            </div>
                                        ) : (
                                            (isCashLeague && cash_amount !== null) && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Per Game Fee:</span>
                                                    <span className="text-xl font-black text-white leading-none">
                                                        ${cash_amount}
                                                        <span className="text-[10px] text-gray-500 not-italic ml-1 uppercase tracking-tighter">(In-Person)</span>
                                                    </span>
                                                </div>
                                            )
                                        )}

                                        {/* Fallback for standard types if neither of the above apply but a price exists */}
                                        {!isCashLeague && !faPrice && registrationFee === 0 && faPrice !== null && (
                                             <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Event Price:</span>
                                                <span className="text-xl font-black text-white italic">${faPrice}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
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

                        {isCashLeague && (
                             <div className="bg-pitch-accent/5 border border-pitch-accent/20 p-5 rounded-sm">
                             <label className="flex items-start gap-4 cursor-pointer">
                                 <input 
                                     type="checkbox" 
                                     required 
                                     checked={cashAcknowledgement}
                                     onChange={e => setCashAcknowledgement(e.target.checked)}
                                     className="mt-1 w-5 h-5 bg-black border-2 border-pitch-accent/50 rounded-sm checked:bg-pitch-accent checked:border-pitch-accent text-black focus:ring-0 focus:ring-offset-0 transition-colors"
                                 />
                                 <span className="text-xs text-pitch-accent font-bold uppercase tracking-wider leading-relaxed">
                                     I understand that all league fees must be paid in cash at the door.
                                 </span>
                             </label>
                         </div>
                        )}

                        <RulesAndTerms 
                            description={description}
                            strictWaiverRequired={strict_waiver_required}
                            waiverDetails={waiver_details}
                            waiverAccepted={waiverAccepted}
                            setWaiverAccepted={setWaiverAccepted}
                        />

                        <button 
                            type="submit" 
                            disabled={isSubmitting || !isFormValid()}
                            className="w-full py-5 bg-pitch-accent text-pitch-black font-black uppercase tracking-[0.2em] hover:bg-white transition-all transform active:scale-[0.98] rounded-lg shadow-[0_0_30px_rgba(204,255,0,0.15)] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Processing...' : (
                                <>{isCashLeague ? 'Confirm Registration' : 'Enter Draft Pool'} <ArrowRight className="w-5 h-5" /></>
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
            
            // Premium Markdown-style parsing (Matching Captain Dashboard)
            if (line.startsWith('# ')) return <h2 key={i} className="text-sm font-black uppercase italic text-white mt-4 first:mt-0 border-l-2 border-pitch-accent pl-3">{line.replace('# ', '')}</h2>;
            if (line.startsWith('## ')) return <h3 key={i} className="text-[11px] font-black uppercase text-pitch-accent mt-3 first:mt-0">{line.replace('## ', '')}</h3>;
            if (line.startsWith('- ')) return <div key={i} className="flex gap-3 items-start ml-1 text-[11px] text-gray-400 leading-relaxed"><div className="w-1 h-1 bg-pitch-accent rounded-full mt-1.5 shrink-0" /><span>{line.replace('- ', '')}</span></div>;
            
            return (
                <p key={i} className="text-gray-400 text-[11px] leading-relaxed italic">
                    {line.split('**').map((part, index) => (
                        index % 2 === 1 ? <strong key={index} className="text-white font-black">{part}</strong> : part
                    ))}
                </p>
            );
        });
    };

    return (
        <div className="space-y-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-xs">
                <ScrollText className="w-4 h-4 text-pitch-accent" />
                League Rules & Terms
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {description && (
                    <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase text-pitch-secondary tracking-widest">Event Rules</div>
                        <div className="bg-black/40 border border-white/10 p-6 rounded-sm max-h-[400px] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                {parseMarkdown(description)}
                            </div>
                        </div>
                    </div>
                )}

                {strictWaiverRequired && (
                    <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase text-pitch-secondary tracking-widest">Legal Waiver</div>
                        <div className="bg-black/40 border border-white/10 p-6 rounded-sm max-h-[400px] overflow-y-auto custom-scrollbar">
                             <div className="space-y-4">
                                {parseMarkdown(waiverDetails || "No additional waiver language specified.")}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {strictWaiverRequired && (
                <label className="flex items-center gap-3 cursor-pointer group pt-2">
                    <input 
                        type="checkbox" 
                        required
                        checked={waiverAccepted}
                        onChange={e => setWaiverAccepted(e.target.checked)}
                        className="w-5 h-5 bg-black border-2 border-white/20 rounded-sm checked:bg-pitch-accent checked:border-pitch-accent text-black focus:ring-0 focus:ring-offset-0 transition-colors cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-400 group-hover:text-white uppercase tracking-widest select-none">I have read and agree to the event terms.</span>
                </label>
            )}
        </div>
    );
}
