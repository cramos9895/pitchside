'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error
        console.error("Game Display Route Error:", error);

        // If it's a transient AbortError/signal cancel, automatically reset/retry immediately
        if (
            error.name === 'AbortError' || 
            error.message?.includes('aborted') || 
            error.message?.includes('signal')
        ) {
            console.warn("Transient AbortError detected in game display. Resetting route...");
            reset();
        }
    }, [error, reset]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-pitch-accent gap-4 p-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-pitch-accent" />
            <h2 className="text-xl font-bold uppercase tracking-widest">Reconnecting to Game Feed...</h2>
            <p className="text-sm text-gray-500 max-w-md">
                The connection was temporarily interrupted. Attempting to reconnect...
            </p>
            <button
                onClick={() => reset()}
                className="mt-4 px-6 py-2 bg-pitch-accent text-black font-black uppercase tracking-widest text-xs rounded hover:bg-white transition-all"
            >
                Reconnect Now
            </button>
        </div>
    );
}
