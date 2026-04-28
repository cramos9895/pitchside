// 🏗️ Architecture: [[SignUpForm.md]]
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, User, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerAccount } from '@/app/actions/auth';

function SignUpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextPath = searchParams.get('next');

    // Form Fields
    const [accountType, setAccountType] = useState<'player' | 'facility'>('player');
    const [organizationName, setOrganizationName] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        if (!fullName.trim()) {
            setError("Please enter your full name.");
            setLoading(false); return;
        }
        if (email !== confirmEmail) {
            setError("Emails do not match.");
            setLoading(false); return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            setLoading(false); return;
        }
        if (accountType === 'facility' && !organizationName.trim()) {
            setError("Organization Name is required for Facility Owners.");
            setLoading(false); return;
        }

        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        formData.append('fullName', fullName);
        formData.append('accountType', accountType);
        if (accountType === 'facility') {
            formData.append('organizationName', organizationName);
        }

        try {
            const result = await registerAccount(formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            // Immediately redirect
            if (nextPath) {
                router.push(nextPath);
            } else if (accountType === 'facility') {
                router.push('/pending');
            } else {
                router.push('/');
            }
            router.refresh();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-pitch-black flex items-center justify-center px-4 font-sans text-white py-12">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pitch-accent/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-lg bg-pitch-card border border-white/10 p-8 rounded-sm relative z-10 shadow-2xl">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block text-3xl font-heading font-black italic tracking-tighter mb-2">
                        PITCH<span className="text-pitch-accent">SIDE</span>
                    </Link>
                    <h2 className="text-2xl font-bold uppercase tracking-wider text-pitch-secondary">
                        Create Account
                    </h2>
                </div>

                {/* Fork in the Road Toggle */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                        type="button"
                        onClick={() => setAccountType('player')}
                        className={cn(
                            "flex flex-col items-center justify-center gap-3 p-4 rounded-sm border-2 transition-all",
                            accountType === 'player'
                                ? "border-pitch-accent bg-pitch-accent/10 text-pitch-accent shadow-[0_0_15px_rgba(204,255,0,0.15)]"
                                : "border-white/10 bg-black/40 text-gray-400 hover:border-white/30 hover:bg-black/60"
                        )}
                    >
                        <User className="w-8 h-8" />
                        <span className="font-bold uppercase tracking-wider text-sm">I am a Player</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAccountType('facility')}
                        className={cn(
                            "flex flex-col items-center justify-center gap-3 p-4 rounded-sm border-2 transition-all",
                            accountType === 'facility'
                                ? "border-pitch-accent bg-pitch-accent/10 text-pitch-accent shadow-[0_0_15px_rgba(204,255,0,0.15)]"
                                : "border-white/10 bg-black/40 text-gray-400 hover:border-white/30 hover:bg-black/60"
                        )}
                    >
                        <Building className="w-8 h-8" />
                        <span className="font-bold uppercase tracking-wider text-sm">Facility Owner</span>
                    </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-4">

                        {/* Conditional Org Name */}
                        {accountType === 'facility' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary mb-2">Organization Name</label>
                                <input
                                    type="text"
                                    value={organizationName}
                                    onChange={(e) => setOrganizationName(e.target.value)}
                                    required
                                    className="w-full bg-black/50 border border-white/10 focus:border-pitch-accent text-white px-4 py-3 rounded-sm outline-none transition-colors font-medium placeholder:text-gray-700"
                                    placeholder="Huntley Park District"
                                />
                            </div>
                        )}

                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary mb-2">Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className="w-full bg-black/50 border border-white/10 focus:border-pitch-accent text-white px-4 py-3 rounded-sm outline-none transition-colors font-medium placeholder:text-gray-700"
                                placeholder="John Doe"
                            />
                        </div>

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

                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary mb-2">Confirm Email</label>
                            <input
                                type="email"
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                                required
                                onPaste={(e) => e.preventDefault()}
                                className="w-full bg-black/50 border border-white/10 focus:border-pitch-accent text-white px-4 py-3 rounded-sm outline-none transition-colors font-medium placeholder:text-gray-700"
                                placeholder="Confirm your email"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary mb-2">Password</label>
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

                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                onPaste={(e) => e.preventDefault()}
                                className="w-full bg-black/50 border border-white/10 focus:border-pitch-accent text-white px-4 py-3 rounded-sm outline-none transition-colors font-medium placeholder:text-gray-700"
                                placeholder="Confirm password"
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
                        className="w-full bg-pitch-accent text-pitch-black font-black uppercase tracking-wider py-4 rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Create Account
                    </button>

                    <div className="text-center mt-6">
                        <Link href="/login" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                            Already have an account? <span className="text-pitch-accent hover:underline font-bold">Sign In</span>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function SignUpPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-pitch-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <SignUpForm />
        </Suspense>
    );
}
