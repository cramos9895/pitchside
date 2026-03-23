'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Lock, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createDepositPaymentIntent } from '@/app/actions/stripe-payment';

// Initialize Stripe outside of component to avoid recreating it
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

interface StripeCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number; // in dollars
    onSuccess: () => void;
    title: string;
    description: string;
}

export function StripeCheckoutModal({ isOpen, onClose, amount, onSuccess, title, description }: StripeCheckoutModalProps) {
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && amount > 0 && !clientSecret) {
            // Fetch PaymentIntent client secret from server
            const gameId = window.location.pathname.split('/').pop();
            const supabase = createClient();
            
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (!user) return;
                
                fetch('/api/checkout/intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameId,
                        userId: user.id,
                        price: amount,
                        title: title,
                        note: description
                    })
                })
                    .then(res => res.json())
                    .then((res) => {
                        if (res.error) throw new Error(res.error);
                        setClientSecret(res.clientSecret);
                    })
                    .catch((err) => console.error('Stripe Intent Fetch Error:', err));
            });
        }
    }, [isOpen, amount, clientSecret, title, description]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            
            <div className="bg-pitch-card border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col relative z-10 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-white/10 flex justify-between items-start shrink-0">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-widest text-white">{title}</h2>
                        <p className="text-sm font-bold uppercase tracking-widest text-pitch-secondary mt-1">{description}</p>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6 bg-white/5 p-4 rounded-xl border border-white/5 shrink-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Due</span>
                        <span className="text-2xl font-black text-white">${amount}</span>
                    </div>

                    {clientSecret ? (
                        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#cbff00', colorBackground: '#1a1a1a', colorText: '#ffffff' } } }}>
                            <CheckoutForm amount={amount} onSuccess={onSuccess} />
                        </Elements>
                    ) : (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pitch-accent"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CheckoutForm({ amount, onSuccess }: { amount: number, onSuccess: () => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsProcessing(true);
        setErrorMessage(null);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL is required, but we'll try to prevent redirect if possible 
                // by using redirect: "if_required" below.
                return_url: window.location.href,
            },
            redirect: 'if_required',
        });

        if (error) {
            setErrorMessage(error.message || 'An unexpected error occurred.');
            setIsProcessing(false);
        } else {
            // Payment succeeded
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement 
               options={{
                   wallets: {
                       applePay: 'auto',
                       googlePay: 'auto'
                   },
               }} 
            />
            
            {errorMessage && (
                <div className="text-red-400 text-xs font-bold uppercase tracking-widest text-center">
                    {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-[0.2em] rounded-lg shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:bg-white transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isProcessing ? 'Processing Secure Payment...' : (
                    <>
                        <Lock className="w-4 h-4" /> Pay ${amount}
                    </>
                )}
            </button>
            <div className="text-center flex items-center justify-center gap-1 text-[10px] uppercase font-black tracking-widest text-gray-500">
                <CheckCircle2 className="w-3 h-3 text-green-500" /> Payments secured by Stripe
            </div>
        </form>
    );
}
