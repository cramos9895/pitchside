'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, UserPlus, DollarSign, CreditCard, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { WaiverModal } from './WaiverModal';
import { getPaymentSettings } from '@/app/actions/settings';

interface JoinGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { note: string; paymentMethod: 'venmo' | 'zelle' | 'cash' | null }) => Promise<void>;
    gamePrice: number;
    loading: boolean;
    isWaitlist: boolean;
    gameId: string;
}

export function JoinGameModal({ isOpen, onClose, onConfirm, gamePrice, loading, isWaitlist, gameId }: JoinGameModalProps) {
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
                    .select('allowed_payment_methods')
                    .eq('id', gameId)
                    .single();

                if (gameData && gameData.allowed_payment_methods) {
                    setAllowedMethods(gameData.allowed_payment_methods);
                }
            }

            // 3. Fetch User Waiver Status (Platform Wide)
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

    const handleNext = () => {
        if (gamePrice > 0 && !isWaitlist) {
            setStep('payment');
        } else {
            // Free game or waitlist
            if (!waiverSigned) {
                setShowWaiver(true);
            } else {
                onConfirm({ note, paymentMethod: null });
            }
        }
    };

    const handlePaymentConfirm = () => {
        if (!paymentMethod) return;
        if (!waiverSigned) {
            setShowWaiver(true);
        } else {
            onConfirm({ note, paymentMethod });
        }
    };

    const handleWaiverAgree = async () => {
        setAgreeingWaiver(true);
        const { data: userData } = await supabase.auth.getUser();

        if (userData.user) {
            await supabase
                .from('waiver_signatures')
                .insert({ user_id: userData.user.id });

            setWaiverSigned(true);
            setShowWaiver(false);

            // Seamlessly continue to join
            if (step === 'payment' && paymentMethod) {
                onConfirm({ note, paymentMethod });
            } else {
                onConfirm({ note, paymentMethod: null });
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

                            <button
                                onClick={handleNext}
                                disabled={loading}
                                className={cn(
                                    "w-full py-4 font-black uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2",
                                    isWaitlist
                                        ? "bg-yellow-500 text-black hover:bg-yellow-400"
                                        : "bg-pitch-accent text-pitch-black hover:bg-white"
                                )}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                    isWaitlist ? "Confirm Waitlist Spot" :
                                        gamePrice === 0 ? "Confirm & Join" : `Continue to Payment ($${gamePrice})`}
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
                                Please send <strong>${gamePrice}</strong> via one of the methods below. Your spot is reserved pending verification.
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
                                        Pay ${gamePrice} on Venmo
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
