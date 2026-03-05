'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

export function ConnectStripeButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleConnect = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/stripe/connect', {
                method: 'POST',
            });

            if (!response.ok) {
                console.error('Failed to create account link');
                setIsLoading(false);
                return;
            }

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Connection error', error);
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-pitch-accent text-pitch-black font-bold uppercase tracking-wider px-8 py-4 rounded hover:bg-white transition-colors disabled:opacity-50"
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <CreditCard className="w-5 h-5" />
            )}
            Connect Stripe Express
        </button>
    );
}
