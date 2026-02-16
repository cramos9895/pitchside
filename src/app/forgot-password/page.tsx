
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const redirectUrl = new URL('/auth/callback', window.location.origin);
            // Simplified to avoid "requested path invalid" error
            // redirectUrl.searchParams.set('next', '/update-password'); 
            const redirectTo = redirectUrl.toString();

            console.log('Requesting Password Reset with redirect:', redirectTo);

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo,
            });

            if (error) throw error;
            setMessage('Check your email for the password reset link.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-pitch-black flex items-center justify-center px-4 font-sans text-white">
            <div className="w-full max-w-md bg-pitch-card border border-white/10 p-8 rounded-sm shadow-2xl relative z-10">
                <Link href="/login" className="mb-6 inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
                </Link>

                <h2 className="text-2xl font-bold uppercase tracking-wider text-white mb-2">Reset Password</h2>
                <p className="text-gray-400 text-sm mb-6">Enter your email to receive a password reset link.</p>

                <form onSubmit={handleReset} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary mb-2">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-black/50 border border-white/10 focus:border-pitch-accent text-white pl-10 pr-4 py-3 rounded-sm outline-none transition-colors font-medium placeholder:text-gray-700"
                                placeholder="player@example.com"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-sm text-red-500 text-sm font-bold text-center">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="p-3 bg-pitch-accent/10 border border-pitch-accent/50 rounded-sm text-pitch-accent text-sm font-bold text-center">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-pitch-accent text-pitch-black font-black uppercase tracking-wider py-3 rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Send Reset Link
                    </button>
                </form>
            </div>
        </div>
    );
}
