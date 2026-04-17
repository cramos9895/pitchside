// 🏗️ Architecture: Error boundary for invite page
// Catches runtime errors in the invite server component and shows a safe user-facing message
// NEVER leaks stack traces, database details, or sensitive info in production
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function InviteError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log to console only — in production this goes to Vercel's log drain, not the browser
        console.error('[Invite Error Boundary]', error.digest || 'no-digest');
    }, [error]);

    return (
        <main className="bg-pitch-black min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-pitch-card border border-white/10 rounded-2xl p-10 text-center shadow-2xl">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-6" />
                
                <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-3">
                    Invite Link Error
                </h1>
                <p className="text-sm text-gray-400 font-medium leading-relaxed mb-8">
                    This invite link could not be loaded. It may have expired, the team may no longer exist, 
                    or there was a temporary server issue.
                </p>
                
                <div className="space-y-3">
                    <button
                        onClick={reset}
                        className="w-full py-4 bg-pitch-accent text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-colors rounded-lg"
                    >
                        Try Again
                    </button>
                    <Link 
                        href="/dashboard"
                        className="w-full py-4 border border-white/20 text-white font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-colors rounded-lg flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Go to Dashboard
                    </Link>
                </div>
            </div>
        </main>
    );
}
