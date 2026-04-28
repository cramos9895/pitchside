'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, User, ArrowRight, ShieldAlert, CreditCard, ScrollText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerCaptain, registerFreeAgent } from '@/app/actions/league-registration';
import { registerRollingCaptain, registerRollingFreeAgent } from '@/app/actions/rolling-league-registration';
import { StripeCheckoutModal } from '@/components/public/StripeCheckoutModal';

interface League {
    id: string;
    name?: string;
    title?: string;
    description?: string | null;
    price_per_team?: number;
    team_price?: number;
    price?: number;
    price_per_free_agent?: number;
    free_agent_price?: number;
    payment_collection_type?: 'stripe' | 'cash';
    cash_fee_structure?: 'per_match' | 'upfront' | null;
    cash_amount?: number | null;
    player_registration_fee?: number | null;
    strict_waiver_required?: boolean;
    waiver_details?: string | null;
}

interface RegistrationFormProps {
    league: League;
    type: 'team' | 'free_agent';
    isRolling?: boolean;
}

export function LeagueRegistrationForm({ league, type, isRolling = false }: RegistrationFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Harmonize data
    const leagueName = league.name || league.title || 'Untitled League';
    const teamPrice = league.price_per_team ?? league.team_price ?? league.price ?? 0;
    const freeAgentPrice = league.price_per_free_agent ?? league.free_agent_price ?? league.player_registration_fee ?? 0;
    const isCashLeague = league.payment_collection_type === 'cash';

    // Shared State
    const [waiverAccepted, setWaiverAccepted] = useState(false);
    const [cashAcknowledgement, setCashAcknowledgement] = useState(false);

    // Team State
    const [teamName, setTeamName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('');
    const [paymentChoice, setPaymentChoice] = useState<'full' | 'split'>('full');
    const [liabilityAccepted, setLiabilityAccepted] = useState(false);

    // Free Agent State
    const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
    const positions = ['Forward', 'Midfield', 'Defense', 'Goalie'];

    // Stripe State
    const [showStripeModal, setShowStripeModal] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

    const handlePositionToggle = (pos: string) => {
        setSelectedPositions(prev => 
            prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
        );
    };

    const isFormValid = () => {
        const waiverValid = league.strict_waiver_required ? waiverAccepted : true;
        const cashValid = isCashLeague ? cashAcknowledgement : true;
        const positionsValid = selectedPositions.length > 0;
        
        if (type === 'team') {
            const liabilityValid = (paymentChoice === 'split' && !isCashLeague) ? liabilityAccepted : true;
            return teamName.trim() !== '' && waiverValid && cashValid && liabilityValid && positionsValid;
        } else {
            return positionsValid && waiverValid && cashValid;
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('leagueId', league.id);
            formData.append('positions', JSON.stringify(selectedPositions));

            if (type === 'team') {
                formData.append('teamName', teamName);
                formData.append('primaryColor', primaryColor);
                formData.append('paymentChoice', paymentChoice);
                
                if (isRolling) {
                    await registerRollingCaptain(formData);
                } else {
                    await registerCaptain(formData);
                }
                alert("Team Captain Registration Successful!");

            } else {
                // For free agents, we still append for backward compatibility if actions expect multiple keys, 
                // but the instruction says to JSON.stringify for cleaner parsing.
                // We'll stick to the JSON.stringify for both as requested.

                // If Stripe, open modal first
                if (!isCashLeague && freeAgentPrice > 0 && !showStripeModal) {
                    setPendingFormData(formData);
                    setShowStripeModal(true);
                    setLoading(false);
                    return;
                }

                if (isRolling) {
                    await registerRollingFreeAgent(formData);
                } else {
                    await registerFreeAgent(formData);
                }
                alert("Free Agent Registration Successful!");
            }
            
            router.push(isRolling ? `/rolling-leagues/${league.id}` : `/leagues/${league.id}`);
            router.refresh();

        } catch (err: any) {
            console.error('Registration Error:', err);
            setError(err.message || 'An error occurred during registration.');
            setLoading(false);
        }
    };

    const handleStripeSuccess = async () => {
        setShowStripeModal(false);
        if (pendingFormData) {
            setLoading(true);
            if (isRolling) {
                await registerRollingFreeAgent(pendingFormData);
            } else {
                await registerFreeAgent(pendingFormData);
            }
            alert("Free Agent Registration & Payment Successful!");
            router.push(isRolling ? `/rolling-leagues/${league.id}` : `/leagues/${league.id}`);
            router.refresh();
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-sm flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                {/* Team Info (If Captain) */}
                {type === 'team' && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-black uppercase text-pitch-secondary tracking-widest mb-2">Team Name</label>
                            <input
                                type="text"
                                required
                                value={teamName}
                                onChange={e => setTeamName(e.target.value)}
                                className="w-full bg-pitch-black border border-white/10 rounded-sm p-4 text-white font-bold focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent outline-none transition-all placeholder:text-gray-700 uppercase"
                                placeholder="ENTER TEAM NAME"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-black uppercase text-pitch-secondary tracking-widest mb-2">Team Jersey Preferred Color</label>
                            <input
                                type="text"
                                required
                                value={primaryColor}
                                onChange={e => setPrimaryColor(e.target.value)}
                                className="w-full bg-pitch-black border border-white/10 rounded-sm p-4 text-white font-bold focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent outline-none transition-all placeholder:text-gray-700 uppercase"
                                placeholder="E.G. RED / WHITE / BLACK"
                            />
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <label className="block text-xs font-black uppercase text-pitch-secondary tracking-widest mb-4">Payment Structure</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div 
                                    onClick={() => setPaymentChoice('full')}
                                    className={cn(
                                        "p-4 border rounded-sm cursor-pointer transition-all border-white/10",
                                        paymentChoice === 'full' ? "bg-pitch-accent/10 border-pitch-accent" : "hover:bg-white/5"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <CreditCard className={cn("w-4 h-4", paymentChoice === 'full' ? "text-pitch-accent" : "text-gray-500")} />
                                        <div className={cn("font-black uppercase tracking-widest text-xs", paymentChoice === 'full' ? "text-pitch-accent" : "text-gray-500")}>
                                            {isCashLeague ? 'Register Full Team' : 'Pay Full Team Fee'}
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black italic text-white">${teamPrice}</div>
                                </div>
                                
                                <div 
                                    onClick={() => !isCashLeague && setPaymentChoice('split')}
                                    className={cn(
                                        "p-4 border rounded-sm transition-all border-white/10",
                                        paymentChoice === 'split' ? "bg-white/10 border-white/50" : (isCashLeague ? "opacity-30 cursor-not-allowed" : "hover:bg-white/5 cursor-pointer")
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <User className={cn("w-4 h-4", paymentChoice === 'split' ? "text-white" : "text-gray-500")} />
                                            <div className={cn("font-black uppercase tracking-widest text-xs", paymentChoice === 'split' ? "text-white" : "text-gray-500")}>Split Payment</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {paymentChoice === 'split' && !isCashLeague && (
                            <div className="bg-[#111] border border-yellow-500/30 p-4 rounded-sm">
                                <label className="flex items-start gap-4 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        required 
                                        checked={liabilityAccepted}
                                        onChange={e => setLiabilityAccepted(e.target.checked)}
                                        className="mt-1 w-5 h-5 bg-black border-2 border-yellow-500/50 rounded-sm checked:bg-yellow-500 checked:border-yellow-500 text-black focus:ring-0 focus:ring-offset-0 transition-colors"
                                    />
                                    <span className="text-xs text-yellow-500/90 font-bold leading-relaxed border-b border-transparent">
                                        I understand I am financially responsible for the remaining balance.
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {/* Universal Positions Section */}
                <div className="space-y-6 pt-6 border-t border-white/5">
                    <div>
                        <label className="block text-xs font-black uppercase text-pitch-secondary tracking-widest mb-4">Preferred Positions</label>
                        <p className="text-xs text-gray-500 mb-4">Select at least one position to represent your role on the pitch.</p>
                        <div className="grid grid-cols-2 gap-3">
                            {positions.map(pos => {
                                const isSelected = selectedPositions.includes(pos);
                                return (
                                    <div 
                                        key={pos}
                                        onClick={() => handlePositionToggle(pos)}
                                        className={cn(
                                            "p-4 border rounded-sm cursor-pointer transition-all border-white/10 flex items-center justify-between group",
                                            isSelected ? "bg-pitch-accent/10 border-pitch-accent" : "hover:bg-white/5"
                                        )}
                                    >
                                        <span className={cn(
                                            "font-black uppercase tracking-widest text-xs", 
                                            isSelected ? "text-pitch-accent" : "text-gray-400 group-hover:text-white"
                                        )}>
                                            {pos}
                                        </span>
                                        <div className={cn(
                                            "w-2 h-2 rounded-full border transition-colors",
                                            isSelected ? "border-pitch-accent bg-pitch-accent shadow-[0_0_10px_rgba(204,255,0,0.5)]" : "border-gray-600"
                                        )} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Free Agent Price Details (Only for FA) */}
                {type === 'free_agent' && (
                    <div className="pt-6 border-t border-white/5 space-y-3">
                        {isCashLeague ? (
                            <>
                                {freeAgentPrice > 0 && (
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-sm border border-white/5">
                                        <div className="font-black uppercase tracking-widest text-xs text-gray-400">Registration Fee</div>
                                        <div className="text-xl font-black italic text-white">
                                            ${freeAgentPrice} 
                                            <span className="text-[10px] text-gray-500 not-italic ml-2 uppercase tracking-tighter">(At First Game)</span>
                                        </div>
                                    </div>
                                )}
                                {league.cash_amount && league.cash_amount > 0 && (
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-sm border border-white/5">
                                        <div className="font-black uppercase tracking-widest text-xs text-gray-400">Per Game Fee</div>
                                        <div className="text-xl font-black italic text-white">
                                            ${league.cash_amount} 
                                            <span className="text-[10px] text-gray-500 not-italic ml-2 uppercase tracking-tighter">(In-Person)</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-sm">
                                <div className="font-black uppercase tracking-widest text-xs text-gray-400">Free Agent Registration</div>
                                <div className="text-xl font-black italic text-white">${freeAgentPrice}</div>
                            </div>
                        )}
                    </div>
                )}


                {/* Dynamic Event Rules & Waiver */}
                {(league.description || league.strict_waiver_required) && (
                    <div className="space-y-6 pt-6 border-t border-white/10">
                        <div className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-xs">
                            <ScrollText className="w-4 h-4 text-pitch-accent" />
                            League Rules & Terms
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {league.description && (
                                <div className="space-y-3">
                                    <div className="text-[10px] font-black uppercase text-pitch-secondary tracking-widest">Event Rules</div>
                                    <div className="bg-black/40 border border-white/10 p-6 rounded-sm max-h-[400px] overflow-y-auto custom-scrollbar">
                                        <div className="space-y-4">
                                            {league.description.split('\n').map((line, i) => {
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
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {league.strict_waiver_required && (
                                <div className="space-y-3">
                                    <div className="text-[10px] font-black uppercase text-pitch-secondary tracking-widest">Legal Waiver</div>
                                    <div className="bg-black/40 border border-white/10 p-6 rounded-sm text-[11px] text-gray-500 leading-relaxed font-medium max-h-[400px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                        {league.waiver_details || "No additional waiver language specified."}
                                    </div>
                                </div>
                            )}
                        </div>

                        {league.strict_waiver_required && (
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
                )}

                {/* Universal Cash League Acknowledgement */}
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

                <button
                    type="submit"
                    disabled={loading || !isFormValid()}
                    className={cn(
                        "w-full py-4 mt-8 font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all",
                        type === 'team' 
                            ? "bg-pitch-accent text-pitch-black hover:bg-white" 
                            : "bg-white text-black hover:bg-pitch-accent",
                        (loading || !isFormValid()) && "opacity-50 cursor-not-allowed grayscale"
                    )}
                >
                    {loading ? 'Processing...' : (
                        <>
                            {type === 'team' ? 'Register Team' : (isCashLeague ? 'Confirm Registration' : 'Pay & Enter Draft Pool')}
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            {/* Optional Stripe Modal for Free Agents */}
            <StripeCheckoutModal
                isOpen={showStripeModal}
                onClose={() => setShowStripeModal(false)}
                amount={freeAgentPrice}
                onSuccess={handleStripeSuccess}
                title="Free Agent Registration"
                description={`Registration for ${leagueName}`}
            />
        </div>
    );
}

