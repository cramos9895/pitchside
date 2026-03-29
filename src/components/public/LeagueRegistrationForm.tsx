'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, User, ArrowRight, ShieldAlert, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerCaptain, registerFreeAgent } from '@/app/actions/league-registration';

interface League {
    id: string;
    name?: string;
    title?: string;
    price_per_team?: number;
    team_price?: number;
    price?: number;
    price_per_free_agent?: number;
    free_agent_price?: number;
}

interface RegistrationFormProps {
    league: League;
    type: 'team' | 'free_agent';
}

export function LeagueRegistrationForm({ league, type }: RegistrationFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Harmonize data
    const leagueName = league.name || league.title || 'Untitled League';
    const teamPrice = league.price_per_team ?? league.team_price ?? league.price ?? 0;
    const freeAgentPrice = league.price_per_free_agent ?? league.free_agent_price ?? 0;

    // Team State
    const [teamName, setTeamName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#ffffff');
    const [paymentChoice, setPaymentChoice] = useState<'full' | 'split'>('full');
    const [liabilityAccepted, setLiabilityAccepted] = useState(false);

    // Free Agent State
    const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
    const positions = ['Forward', 'Midfield', 'Defense', 'Goalie'];

    const handlePositionToggle = (pos: string) => {
        setSelectedPositions(prev => 
            prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('leagueId', league.id);

            if (type === 'team') {
                if (paymentChoice === 'split' && !liabilityAccepted) {
                    throw new Error("You must accept the financial liability terms for split payments.");
                }
                formData.append('teamName', teamName);
                formData.append('primaryColor', primaryColor);
                formData.append('paymentChoice', paymentChoice);
                
                await registerCaptain(formData);
                // In a real app, 'full' would redirect to Stripe here. 
                // For this requirement, we just execute the DB action and bounce.
                alert("Team Captain Registration Successful!");

            } else {
                if (selectedPositions.length === 0) {
                    throw new Error("Please select at least one preferred position.");
                }
                selectedPositions.forEach(pos => formData.append('positions', pos));
                
                await registerFreeAgent(formData);
                alert("Free Agent Registration Successful!");
            }
            
            router.push(`/leagues/${league.id}`);
            router.refresh();

        } catch (err: any) {
            console.error('Registration Error:', err);
            setError(err.message || 'An error occurred during registration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-sm flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {type === 'team' ? (
                <>
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
                            <label className="block text-xs font-black uppercase text-pitch-secondary tracking-widest mb-2">Primary Color</label>
                            <div className="flex items-center gap-4 bg-pitch-black border border-white/10 p-2 rounded-sm w-fit">
                                <input
                                    type="color"
                                    required
                                    value={primaryColor}
                                    onChange={e => setPrimaryColor(e.target.value)}
                                    className="w-12 h-12 bg-transparent border-none cursor-pointer p-0"
                                />
                                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest min-w-[80px]">{primaryColor}</span>
                            </div>
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
                                        <div className={cn("font-black uppercase tracking-widest text-xs", paymentChoice === 'full' ? "text-pitch-accent" : "text-gray-500")}>Pay Full Team Fee</div>
                                    </div>
                                    <div className="text-2xl font-black italic text-white">${teamPrice}</div>
                                </div>
                                
                                <div 
                                    onClick={() => setPaymentChoice('split')}
                                    className={cn(
                                        "p-4 border rounded-sm cursor-pointer transition-all border-white/10",
                                        paymentChoice === 'split' ? "bg-white/10 border-white/50" : "hover:bg-white/5"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <User className={cn("w-4 h-4", paymentChoice === 'split' ? "text-white" : "text-gray-500")} />
                                            <div className={cn("font-black uppercase tracking-widest text-xs", paymentChoice === 'split' ? "text-white" : "text-gray-500")}>Split Payment</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400 font-medium">Invite players to pay their share. <br/>Captain secures the spot.</div>
                                </div>
                            </div>
                        </div>

                        {paymentChoice === 'split' && (
                            <div className="bg-[#111] border border-yellow-500/30 p-4 rounded-sm animate-in fade-in zoom-in duration-300">
                                <label className="flex items-start gap-4 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        required 
                                        checked={liabilityAccepted}
                                        onChange={e => setLiabilityAccepted(e.target.checked)}
                                        className="mt-1 w-5 h-5 bg-black border-2 border-yellow-500/50 rounded-sm checked:bg-yellow-500 checked:border-yellow-500 text-black focus:ring-0 focus:ring-offset-0 transition-colors"
                                    />
                                    <span className="text-xs text-yellow-500/90 font-bold leading-relaxed">
                                        I understand I am financially responsible for the remaining balance. If my roster has not paid in full by the registration cutoff, my card on file will be charged the difference.
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-black uppercase text-pitch-secondary tracking-widest mb-4">Preferred Positions</label>
                            <p className="text-xs text-gray-500 mb-4">Select all that apply to drop into the global draft pool.</p>
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
                                                "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                                                isSelected ? "border-pitch-accent bg-pitch-accent" : "border-gray-600"
                                            )}>
                                                {isSelected && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-sm">
                                <div className="font-black uppercase tracking-widest text-xs text-gray-400">Free Agent Fee</div>
                                <div className="text-xl font-black italic text-white">${freeAgentPrice}</div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <button
                type="submit"
                disabled={loading}
                className={cn(
                    "w-full py-4 mt-8 font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all",
                    type === 'team' 
                        ? "bg-pitch-accent text-pitch-black hover:bg-white" 
                        : "bg-white text-black hover:bg-pitch-accent",
                    loading && "opacity-50 cursor-not-allowed"
                )}
            >
                {loading ? 'Processing...' : (
                    <>
                        {type === 'team' ? 'Register Team' : 'Enter Draft Pool'}
                        <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
    );
}
