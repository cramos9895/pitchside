
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';

export default function UpdatePassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            // Redirect to dashboard with success toast (could add a query param to show toast)
            router.push('/dashboard?passwordUpdated=true');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-pitch-black flex items-center justify-center px-4 font-sans text-white">
            <div className="w-full max-w-md bg-pitch-card border border-white/10 p-8 rounded-sm shadow-2xl relative z-10">
                <h2 className="text-2xl font-bold uppercase tracking-wider text-white mb-2">Set New Password</h2>
                <p className="text-gray-400 text-sm mb-6">Create a new secure password for your account.</p>

                <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary mb-2">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-black/50 border border-white/10 focus:border-pitch-accent text-white pl-10 pr-4 py-3 rounded-sm outline-none transition-colors font-medium placeholder:text-gray-700"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-pitch-secondary mb-2">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-black/50 border border-white/10 focus:border-pitch-accent text-white pl-10 pr-4 py-3 rounded-sm outline-none transition-colors font-medium placeholder:text-gray-700"
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
                        className="w-full bg-pitch-accent text-pitch-black font-black uppercase tracking-wider py-3 rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
}
