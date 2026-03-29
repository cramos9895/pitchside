'use client';

import { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { X } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

interface EmbeddedCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientSecret: string;
}

export function EmbeddedCheckoutModal({ isOpen, onClose, clientSecret }: EmbeddedCheckoutModalProps) {
    if (!isOpen || !clientSecret) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative z-10 w-full max-w-lg max-h-[90vh] bg-pitch-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-pitch-accent rounded-full animate-pulse" />
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Secure Checkout</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stripe Embedded Checkout */}
                <div className="overflow-y-auto flex-1 p-1">
                    <EmbeddedCheckoutProvider
                        stripe={stripePromise}
                        options={{ clientSecret }}
                    >
                        <EmbeddedCheckout className="stripe-embedded-checkout" />
                    </EmbeddedCheckoutProvider>
                </div>
            </div>
        </div>
    );
}
