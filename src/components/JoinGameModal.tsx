'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, UserPlus, DollarSign, CreditCard, Copy, Check, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { WaiverModal } from './WaiverModal';
import { getPaymentSettings } from '@/app/actions/settings';
import { validatePromoCode } from '@/app/actions/payments';

interface JoinGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { note: string; paymentMethod: 'venmo' | 'zelle' | 'cash' | null; promoCodeId?: string; teamAssignment?: string; isFreeAgent?: boolean; prizeSplitPreference?: string; isLeagueCaptainVaulting?: boolean }) => Promise<void>;
    gamePrice: number;
    loading: boolean;
    isWaitlist: boolean;
    gameId: string;
    isLeague?: boolean;
}

export function JoinGameModal({ isOpen, onClose, onConfirm, gamePrice, loading, isWaitlist, gameId, isLeague }: JoinGameModalProps) {
    const [step, setStep] = useState<'details' | 'payment'>('details');
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'venmo' | 'zelle' | 'cash' | null>(null);
    const [copied, setCopied] = useState(false);

    const [venmoHandle, setVenmoHandle] = useState('PitchSideCF');
    const [zelleInfo, setZelleInfo] = useState('555-0199');
    const [allowedMethods, setAllowedMethods] = useState<string[]>(['venmo', 'zelle']);

    // Waiver State
    const [waiverSigned, setWaiverSigned] = useState(false);
    const [showWaiver, setShowWaiver] = useState(false);
    const [agreeingWaiver, setAgreeingWaiver] = useState(false);

    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<{ id: string; discount_type: string; discount_value: number; code: string } | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);

    // Squad UI State
    const [joinMode, setJoinMode] = useState<'squad' | 'free-agent'>('squad');
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [teamsConfig, setTeamsConfig] = useState<any[]>([]);
    const [rosters, setRosters] = useState<any[]>([]);

    // Prize Pool State
    const [hasPrizePool, setHasPrizePool] = useState(false);
    const [prizeSplitPreference, setPrizeSplitPreference] = useState<'pay_captain' | 'split_evenly'>('split_evenly');
    

    const supabase = createClient();

    useEffect(() => {
        const fetchSettings = async () => {
            // 1. Fetch System Settings via un-cached Server Action
            const settingsData = await getPaymentSettings();

            if (settingsData) {
                settingsData.forEach((setting: { key: string; value: string }) => {
                    if (setting.key === 'payment.venmo_handle') setVenmoHandle(setting.value);
                    if (setting.key === 'payment.zelle_info') setZelleInfo(setting.value);
                });
            }

            // 2. Fetch Game Settings (Specific)
            if (gameId) {
                const { data: gameData } = await supabase
                    .from('games')
                    .select('allowed_payment_methods, teams_config')
                    .eq('id', gameId)
                    .single();

                if (gameData && gameData.allowed_payment_methods) {
                    setAllowedMethods(gameData.allowed_payment_methods);
                }

                if (gameData && gameData.teams_config && Array.isArray(gameData.teams_config)) {
                    setTeamsConfig(gameData.teams_config);

                    // Fetch Active Squad Rosters
                    const { data: activeBookings } = await supabase
                        .from('bookings')
                        .select(`
                            team_assignment,
                            stripe_payment_method_id,
                            user:profiles!bookings_user_id_fkey (full_name)
                        `)
                        .eq('game_id', gameId)
                        .neq('status', 'cancelled')
                        .not('team_assignment', 'is', null);

                    if (activeBookings) setRosters(activeBookings);
                }
            }

            // 3. Fetch User Waiver Status
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
                const { data: signature } = await supabase
                    .from('waiver_signatures')
                    .select('id')
                    .eq('user_id', userData.user.id)
                    .is('facility_id', null)
                    .maybeSingle();

                if (signature) {
                    setWaiverSigned(true);
                }
            }
        };
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen, gameId, supabase]);

    const VENMO_HANDLE = venmoHandle;
    const ZELLE_INFO = zelleInfo;

    const handleCopyZelle = () => {
        navigator.clipboard.writeText(ZELLE_INFO);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    let targetPrice = gamePrice;
    let customFeeActive = false;

    // Phase 43: Split Payments Invite Override
    if (isLeague && selectedTeam) {
        // Find if this team has a captain (someone with a vaulted card on this team)
        const teamCaptain = rosters.find(r => r.team_assignment === selectedTeam && !!r.stripe_payment_method_id);
        if (teamCaptain && teamCaptain.custom_invite_fee !== null && teamCaptain.custom_invite_fee !== undefined) {
            targetPrice = teamCaptain.custom_invite_fee;
            customFeeActive = true;
        }
    }

    let discountAmount = 0;
    if (appliedPromo) {
        if (appliedPromo.discount_type === 'percentage') {
            discountAmount = targetPrice * (appliedPromo.discount_value / 100);
        } else if (appliedPromo.discount_type === 'fixed_amount') {
            discountAmount = appliedPromo.discount_value / 100;
        }
    }
    const finalPrice = Math.max(0, targetPrice - discountAmount);

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setIsApplyingPromo(true);
        setPromoError(null);

        // Fetch Global Codes
        const result = await validatePromoCode(promoCode.trim());

        if (result.error) {
            setPromoError(result.error);
            setAppliedPromo(null);
        } else if (result.promo) {
            setAppliedPromo(result.promo);
            setPromoCode('');
        }

        setIsApplyingPromo(false);
    };

    const handleNext = () => {
        if (joinMode === 'squad' && teamsConfig.length > 0 && selectedTeam === null && !isWaitlist) {
            alert("Please select a squad to join.");
            return;
        }

        if (joinMode === 'free-agent' && !isWaitlist) {
            // Free Agents IMMEDIATELY go to Stripe to vault. No manual cash/venmo.
            if (!waiverSigned) {
                setShowWaiver(true);
            } else {
                onConfirm({ note, paymentMethod: null, promoCodeId: appliedPromo?.id, isFreeAgent: true });
            }
            return;
        }

        const isCaptain = selectedTeam !== null && rosters.filter(r => r.team_assignment === selectedTeam).length === 0;
        const finalPrizePref = hasPrizePool && isCaptain ? prizeSplitPreference : undefined;
        const isVaultingSession = isLeague && isCaptain;

        if (finalPrice > 0 && !isWaitlist) {
            setStep('payment');
        } else {
            // Free game or waitlist
            if (!waiverSigned) {
                setShowWaiver(true);
            } else {
                onConfirm({ note, paymentMethod: null, promoCodeId: appliedPromo?.id, teamAssignment: selectedTeam !== null ? selectedTeam : undefined, prizeSplitPreference: finalPrizePref, isLeagueCaptainVaulting: isVaultingSession });
            }
        }
    };

    const handlePaymentConfirm = () => {
        if (!paymentMethod) return;
        
        const isCaptain = selectedTeam !== null && rosters.filter(r => r.team_assignment === selectedTeam).length === 0;
        const finalPrizePref = hasPrizePool && isCaptain ? prizeSplitPreference : undefined;
        const isVaultingSession = isLeague && isCaptain;

        if (!waiverSigned) {
            setShowWaiver(true);
        } else {
            onConfirm({ note, paymentMethod, promoCodeId: appliedPromo?.id, teamAssignment: selectedTeam !== null ? selectedTeam : undefined, prizeSplitPreference: finalPrizePref, isLeagueCaptainVaulting: isVaultingSession });
        }
    };

    const handleWaiverAgree = async () => {
        setAgreeingWaiver(true);
        const { data: userData } = await supabase.auth.getUser();

        if (userData.user) {
            await supabase
                .from('waiver_signatures')
                .insert({ 
                    user_id: userData.user.id
                });

            setWaiverSigned(true);
            setShowWaiver(false);

            const isCaptain = selectedTeam !== null && rosters.filter(r => r.team_assignment === selectedTeam).length === 0;
            const finalPrizePref = hasPrizePool && isCaptain ? prizeSplitPreference : undefined;
            const isVaultingSession = isLeague && isCaptain;

            // Seamlessly continue to join
            if (step === 'payment' && paymentMethod) {
                onConfirm({ note, paymentMethod, promoCodeId: appliedPromo?.id, teamAssignment: selectedTeam !== null ? selectedTeam : undefined, isFreeAgent: joinMode === 'free-agent', prizeSplitPreference: finalPrizePref, isLeagueCaptainVaulting: isVaultingSession });
            } else {
                onConfirm({ note, paymentMethod: null, promoCodeId: appliedPromo?.id, teamAssignment: selectedTeam !== null ? selectedTeam : undefined, isFreeAgent: joinMode === 'free-agent', prizeSplitPreference: finalPrizePref, isLeagueCaptainVaulting: isVaultingSession });
            }
        }
        setAgreeingWaiver(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-pitch-card border border-white/10 p-6 rounded-sm max-w-md w-full shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                {step === 'details' && (
                    <>
                        <div className="mb-6">
                            <h2 className="font-heading text-2xl font-bold italic uppercase flex items-center gap-2">
                                <UserPlus className="w-6 h-6 text-pitch-accent" />
                                {isWaitlist ? 'Join Waitlist' : 'Join Match'}
                            </h2>
                            <p className="text-pitch-secondary text-sm mt-2">
                                {isWaitlist
                                    ? "This game is full. Join the waitlist and we'll notify you if a spot opens up."
                                    : "You're about to join the squad. Let's get you set up."}
                            </p>
                        </div>

                        <div className="space-y-4">
                            {teamsConfig.length > 0 && !isWaitlist && isLeague && (
                                <div className="mb-6 space-y-3">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">How are you joining?</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setJoinMode('squad')}
                                            className={cn(
                                                "p-3 rounded-sm border transition-all text-center",
                                                joinMode === 'squad' ? "bg-pitch-accent/10 border-pitch-accent text-white font-bold" : "bg-black/60 border-white/10 hover:border-white/30 text-gray-400"
                                            )}
                                        >
                                            Pick a Squad
                                        </button>
                                        <button
                                            onClick={() => setJoinMode('free-agent')}
                                            className={cn(
                                                "p-3 rounded-sm border transition-all text-center",
                                                joinMode === 'free-agent' ? "bg-pitch-accent/10 border-pitch-accent text-white font-bold" : "bg-black/60 border-white/10 hover:border-white/30 text-gray-400"
                                            )}
                                        >
                                            Free Agent
                                        </button>
                                    </div>
                                </div>
                            )}

                            {joinMode === 'squad' && teamsConfig.length > 0 && !isWaitlist ? (
                                <div className="space-y-3 mb-6">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">Select Your Squad</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                        {teamsConfig.map((team, i) => {
                                            const teamName = team.name || `Team ${i + 1}`;
                                            const teamRoster = rosters.filter(r => r.team_assignment === teamName);
                                            const maxForThisTeam = team.limit || 0;
                                            const isFull = maxForThisTeam > 0 && teamRoster.length >= maxForThisTeam;
                                            const isSelected = selectedTeam === teamName;

                                            return (
                                                <button
                                                    key={teamName}
                                                    onClick={() => !isFull && setSelectedTeam(teamName)}
                                                    disabled={isFull}
                                                    className={cn(
                                                        "text-left p-4 rounded-sm border transition-all relative overflow-hidden group",
                                                        isSelected ? "bg-pitch-accent/10 border-pitch-accent" : "bg-black/60 border-white/10 hover:border-white/30",
                                                        isFull && "opacity-50 cursor-not-allowed grayscale"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h4 className={cn("font-black italic uppercase tracking-wider", isSelected ? "text-pitch-accent" : "text-white")}>
                                                            {teamName}
                                                        </h4>
                                                        <div className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded tracking-widest text-gray-400">
                                                            {teamRoster.length}/{maxForThisTeam > 0 ? maxForThisTeam : '∞'}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5 min-h-[60px]">
                                                        {teamRoster.map((player, idx) => {
                                                            const profile = Array.isArray(player.user) ? player.user[0] : player.user;
                                                            const fullName = profile?.full_name || 'Anonymous';
                                                            return (
                                                                <div key={idx} className="text-xs text-gray-300 font-medium flex items-center gap-1.5 truncate pr-2">
                                                                    <div className="w-1 h-1 rounded-full bg-pitch-accent/50 shrink-0"></div>
                                                                    <span className="truncate">{fullName}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        {teamRoster.length === 0 && (
                                                            <div className="text-xs text-gray-500 italic">No players yet.</div>
                                                        )}
                                                    </div>

                                                    {isFull && (
                                                        <div className="absolute inset-x-0 bottom-0 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase text-center py-1 border-t border-red-500/20">
                                                            Squad Full
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {hasPrizePool && selectedTeam !== null && rosters.filter(r => r.team_assignment === selectedTeam).length === 0 && (
                                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-sm p-4 mt-4 animate-in fade-in">
                                            <h4 className="flex items-center gap-2 text-yellow-500 font-bold uppercase text-xs mb-3">
                                                <Award className="w-4 h-4" /> Prize Distribution Preference
                                            </h4>
                                            <p className="text-[10px] text-gray-400 mb-3 uppercase font-medium">As team captain, how should the prize be distributed if your squad wins?</p>
                                            <div className="flex flex-col gap-2">
                                                <label className="flex items-center gap-2 cursor-pointer bg-black/40 p-2 rounded border border-white/5 hover:border-white/20 transition-colors">
                                                    <input 
                                                        type="radio" 
                                                        name="prizePref" 
                                                        checked={prizeSplitPreference === 'split_evenly'} 
                                                        onChange={() => setPrizeSplitPreference('split_evenly')}
                                                        className="accent-pitch-accent w-4 h-4"
                                                    />
                                                    <span className="text-sm font-bold text-gray-300">Split Evenly Among Roster</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer bg-black/40 p-2 rounded border border-white/5 hover:border-white/20 transition-colors">
                                                    <input 
                                                        type="radio" 
                                                        name="prizePref" 
                                                        checked={prizeSplitPreference === 'pay_captain'} 
                                                        onChange={() => setPrizeSplitPreference('pay_captain')}
                                                        className="accent-pitch-accent w-4 h-4"
                                                    />
                                                    <span className="text-sm font-bold text-gray-300">Send Entirely to Captain (You)</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-2">
                                        Teammate Request (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Mike Johnson"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full bg-black/50 border border-white/20 rounded-sm p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                                    />
                                </div>
                            )}

                            {!isWaitlist && gamePrice > 0 && (
                                <div className="space-y-3 pb-3 border-b border-white/10">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-pitch-secondary mb-1">Promo Code</label>

                                    {appliedPromo ? (
                                        <div className="flex items-center justify-between bg-pitch-accent/10 border border-pitch-accent/30 rounded-sm px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-pitch-accent animate-pulse"></div>
                                                <span className="text-pitch-accent font-bold uppercase tracking-widest text-sm">{appliedPromo.code}</span>
                                                <span className="text-white text-xs ml-2 border-l border-white/20 pl-2">
                                                    {appliedPromo.discount_type === 'percentage' ? `${appliedPromo.discount_value}% OFF` : `$${(appliedPromo.discount_value / 100).toFixed(2)} OFF`}
                                                </span>
                                            </div>
                                            <button onClick={() => setAppliedPromo(null)} className="text-gray-400 hover:text-white transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter code"
                                                value={promoCode}
                                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                                className="flex-1 bg-black/50 border border-white/20 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-pitch-accent uppercase placeholder:normal-case font-bold"
                                            />
                                            <button
                                                onClick={handleApplyPromo}
                                                disabled={!promoCode || isApplyingPromo}
                                                className="bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider px-6 rounded-sm transition-colors disabled:opacity-50"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    )}
                                    {promoError && <p className="text-red-400 text-xs font-medium">{promoError}</p>}
                                </div>
                            )}

                            {joinMode === 'free-agent' && !isWaitlist && (
                                <div className="bg-pitch-accent/10 border border-pitch-accent/20 rounded-sm p-4 mb-4 text-sm mt-4">
                                    <h4 className="font-bold text-pitch-accent mb-1 uppercase tracking-wider text-xs">Pre-Authorization Hold</h4>
                                    <p className="text-gray-300">
                                        Your card will <strong className="text-white">not be charged today</strong>. We will secure your card on file and automatically charge <strong>${finalPrice.toFixed(2)}</strong> only if you are officially drafted to a squad.
                                    </p>
                                </div>
                            )}

                            {customFeeActive && !isWaitlist && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-sm p-4 mb-4 text-sm mt-4">
                                    <h4 className="font-bold text-green-400 mb-1 uppercase tracking-wider text-xs flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" /> Captain's Invite Fee
                                    </h4>
                                    <p className="text-gray-300 text-xs">
                                        The Captain of <strong>{selectedTeam}</strong> has set a customized split roster fee of <strong className="text-white">${finalPrice.toFixed(2)}</strong> to join their squad.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleNext}
                                disabled={loading}
                                className={cn(
                                    "w-full py-4 font-black uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2 mt-4",
                                    isWaitlist
                                        ? "bg-yellow-500 text-black hover:bg-yellow-400"
                                        : "bg-pitch-accent text-pitch-black hover:bg-white"
                                )}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                    isWaitlist ? "Confirm Waitlist Spot" :
                                        joinMode === 'free-agent' ? "Vault Card & Register as Free Agent" :
                                            finalPrice === 0 ? "Confirm & Join" : `Continue to Payment ($${finalPrice.toFixed(2)})`}
                            </button>
                        </div>
                    </>
                )}

                {step === 'payment' && (
                    <div className="animate-in slide-in-from-right duration-200">
                        <div className="mb-6">
                            <h2 className="font-heading text-2xl font-bold italic uppercase flex items-center gap-2">
                                <DollarSign className="w-6 h-6 text-green-400" />
                                Payment Required
                            </h2>
                            <p className="text-pitch-secondary text-sm mt-2">
                                Please send <strong>${finalPrice.toFixed(2)}</strong> via one of the methods below. Your spot is reserved pending verification.
                            </p>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="grid gap-3">
                                {allowedMethods.includes('venmo') && (
                                    <button
                                        onClick={() => setPaymentMethod('venmo')}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-sm border transition-all",
                                            paymentMethod === 'venmo'
                                                ? "bg-blue-500/20 border-blue-500 text-white"
                                                : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
                                        )}
                                    >
                                        <span className="font-bold flex items-center gap-2">
                                            <span className="text-xl">V</span> Venmo
                                        </span>
                                        {paymentMethod === 'venmo' && <Check className="w-5 h-5 text-blue-500" />}
                                    </button>
                                )}

                                {allowedMethods.includes('zelle') && (
                                    <button
                                        onClick={() => setPaymentMethod('zelle')}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-sm border transition-all",
                                            paymentMethod === 'zelle'
                                                ? "bg-purple-500/20 border-purple-500 text-white"
                                                : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
                                        )}
                                    >
                                        <span className="font-bold flex items-center gap-2">
                                            <span className="text-xl">Z</span> Zelle
                                        </span>
                                        {paymentMethod === 'zelle' && <Check className="w-5 h-5 text-purple-500" />}
                                    </button>
                                )}

                                {allowedMethods.includes('cash') && (
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-sm border transition-all",
                                            paymentMethod === 'cash'
                                                ? "bg-green-500/20 border-green-500 text-white"
                                                : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
                                        )}
                                    >
                                        <span className="font-bold flex items-center gap-2">
                                            <DollarSign className="w-5 h-5" /> Cash (At Field)
                                        </span>
                                        {paymentMethod === 'cash' && <Check className="w-5 h-5 text-green-500" />}
                                    </button>
                                )}

                                {allowedMethods.includes('stripe') && (
                                    <div className="relative group">
                                        <button
                                            disabled
                                            className="w-full flex items-center justify-between p-4 rounded-sm border border-white/5 bg-white/5 text-gray-500 cursor-not-allowed opacity-60"
                                        >
                                            <span className="font-bold flex items-center gap-2">
                                                <CreditCard className="w-5 h-5" /> Pay with Card
                                            </span>
                                        </button>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 shadow-xl">
                                            Online payments coming soon
                                        </div>
                                    </div>
                                )}
                            </div>

                            {paymentMethod === 'venmo' && (
                                <div className="p-3 bg-blue-500/10 rounded-sm text-sm text-blue-200 mb-2">
                                    <p className="mb-2">Tap to open Venmo:</p>
                                    <a
                                        href={`https://venmo.com/${VENMO_HANDLE.replace('@', '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-2 bg-blue-500 text-white font-bold text-center rounded-sm hover:bg-blue-400"
                                    >
                                        Pay ${finalPrice.toFixed(2)} on Venmo
                                    </a>
                                </div>
                            )}

                            {paymentMethod === 'zelle' && (
                                <div className="p-3 bg-purple-500/10 rounded-sm text-sm text-purple-200 mb-2">
                                    <p className="mb-2">Please send your Zelle payment to:</p>
                                    <div className="flex items-center justify-between bg-black/30 p-3 rounded border border-purple-500/20">
                                        <span className="font-mono text-lg font-bold">{ZELLE_INFO}</span>
                                        <button onClick={handleCopyZelle} className="text-purple-400 hover:text-white">
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handlePaymentConfirm}
                            disabled={!paymentMethod || loading}
                            className={cn(
                                "w-full py-4 font-black uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2",
                                !paymentMethod
                                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                    : "bg-green-500 text-black hover:bg-green-400"
                            )}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "I Have Paid"}
                        </button>

                        <button
                            onClick={() => setStep('details')}
                            className="w-full mt-2 py-2 text-xs font-bold uppercase text-gray-500 hover:text-white"
                        >
                            Back
                        </button>
                    </div>
                )}
            </div>

            <WaiverModal
                isOpen={showWaiver}
                onClose={() => setShowWaiver(false)}
                onAgree={handleWaiverAgree}
                loading={agreeingWaiver}
            />
        </div>
    );
}
