// 🏗️ Architecture: [[LoginForm.md]]
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextPath = searchParams.get('next');

    // Form Fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Authenticate the Browser Client (Populates LocalStorage for Realtime/Client hooks)
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message || 'Failed to sign in.');
                setLoading(false);
                return;
            }

            // 2. Authenticate the Next.js Server (Populates HttpOnly Cookie for Server Components)
            const formData = new FormData();
            formData.append('email', email);
            formData.append('password', password);
            if (nextPath) {
                formData.append('next', nextPath);
            }

            const response = await fetch('/auth/login', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || 'Failed to authenticate server session.');
                setLoading(false);
                return;
            }

            // 3. Clear Next.js Client Router Cache and Navigate
            if (result.success && result.url) {
                router.refresh(); // Purge stale unauthenticated caches
                setTimeout(() => {
                    router.push(result.url);
                }, 100);
            }

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-pitch-black flex items-center justify-center px-4 font-sans text-white relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pitch-accent/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md bg-pitch-card border border-white/10 p-4 sm:p-8 rounded-sm relative z-10 shadow-2xl">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-block text-3xl font-heading font-black italic tracking-tighter mb-2">
                        PITCH<span className="text-pitch-accent">SIDE</span>
                    </Link>
                    <h2 className="text-xl font-bold uppercase tracking-wider text-pitch-secondary">
                        Welcome Back
                    </h2>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary mb-2">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-black/50 border border-white/10 focus:border-pitch-accent text-white px-4 py-3 rounded-sm outline-none transition-colors font-medium placeholder:text-gray-700"
                                placeholder="player@example.com"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary">Password</label>
                                <Link href="/forgot-password" className="text-xs text-pitch-accent hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-black/50 border border-white/10 focus:border-pitch-accent text-white px-4 py-3 rounded-sm outline-none transition-colors font-medium placeholder:text-gray-700"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-sm text-red-500 text-sm font-bold text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-pitch-accent text-pitch-black font-black uppercase tracking-wider py-3 sm:py-4 rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Enter the Pitch
                    </button>

                    <div className="text-center mt-6">
                        <Link href="/signup" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                            Need an account? <span className="text-pitch-accent hover:underline font-bold">Sign Up</span>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-pitch-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <LoginForm />
        </Suspense>
    );
}
