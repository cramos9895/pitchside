// 🏗️ Architecture: [[LoginForm.md]]
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { loginUser } from '@/app/actions/auth';

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
            const formData = new FormData();
            formData.append('email', email);
            formData.append('password', password);

            const result = await loginUser(formData);

            if (result.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            if (result.success) {
                if (nextPath) {
                    router.push(nextPath);
                } else if (result.systemRole === 'facility_admin' || result.systemRole === 'super_admin') {
                    router.push('/facility');
                } else {
                    router.push('/');
                }
                router.refresh();
            }

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-pitch-black flex items-center justify-center px-4 font-sans text-white">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pitch-accent/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md bg-pitch-card border border-white/10 p-8 rounded-sm relative z-10 shadow-2xl">
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
                            <label className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary mb-2">Email</label>
                            <input
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
                                <label className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary">Password</label>
                                <Link href="/forgot-password" className="text-xs text-pitch-accent hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                            <input
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
                        className="w-full bg-pitch-accent text-pitch-black font-black uppercase tracking-wider py-4 rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8"
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
