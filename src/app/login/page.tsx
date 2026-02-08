
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });
                if (error) throw error;
                setMessage('Check your email for the confirmation link.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/');
                router.refresh(); // Refresh to update server components/navbar
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-pitch-black flex items-center justify-center px-4 font-sans text-white">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pitch-accent/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md bg-pitch-card border border-white/10 p-8 rounded-sm relative z-10 shadow-2xl">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block text-3xl font-heading font-black italic tracking-tighter mb-2">
                        PITCH<span className="text-pitch-accent">SIDE</span>
                    </Link>
                    <h2 className="text-xl font-bold uppercase tracking-wider text-pitch-secondary">
                        {isSignUp ? 'Join the Club' : 'Welcome Back'}
                    </h2>
                </div>

                {/* Toggle */}
                <div className="flex bg-black/40 p-1 rounded-sm mb-8 border border-white/5">
                    <button
                        onClick={() => setIsSignUp(false)}
                        className={cn(
                            "flex-1 py-2 text-sm font-bold uppercase tracking-wider transition-all rounded-sm",
                            !isSignUp ? "bg-pitch-accent text-pitch-black shadow-[0_0_10px_rgba(204,255,0,0.3)]" : "text-gray-400 hover:text-white"
                        )}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => setIsSignUp(true)}
                        className={cn(
                            "flex-1 py-2 text-sm font-bold uppercase tracking-wider transition-all rounded-sm",
                            isSignUp ? "bg-pitch-accent text-pitch-black shadow-[0_0_10px_rgba(204,255,0,0.3)]" : "text-gray-400 hover:text-white"
                        )}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
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
                        className="w-full bg-pitch-accent text-pitch-black font-black uppercase tracking-wider py-4 rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSignUp ? 'Create Account' : 'Enter the Pitch'}
                    </button>
                </form>
            </div>
        </div>
    );
}
