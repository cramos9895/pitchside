'use client';

import { useState } from 'react';
import { inviteFacilityStaff } from '@/app/actions/facility-team';
import { Plus, Mail, Loader2 } from 'lucide-react';

export function InviteStaffModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const res = await inviteFacilityStaff(email);
            if (res.success) {
                setSuccess(true);
                setTimeout(() => {
                    setIsOpen(false);
                    setEmail('');
                    setSuccess(false);
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-6 py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-pitch-accent/20 transition-all border border-transparent hover:border-white"
            >
                <Plus className="w-5 h-5" /> Invite Staff
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => { if (!loading) setIsOpen(false); }}
                    />

                    <div className="relative bg-pitch-black border border-white/10 rounded-lg shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
                        <h2 className="text-2xl font-heading font-black italic uppercase tracking-tight text-white mb-2">
                            Invite <span className="text-pitch-accent">Staff</span>
                        </h2>
                        <p className="text-gray-400 mb-8 font-medium">
                            Send an email invitation to add a new admin to your facility. If they already have an account, they will simply be linked.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@pitchside.com"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg pl-12 pr-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-pitch-accent focus:ring-1 focus:ring-pitch-accent transition-all"
                                        disabled={loading || success}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-lg">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-bold rounded-lg">
                                    Invitation successfully processed!
                                </div>
                            )}

                            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    disabled={loading}
                                    className="px-6 py-3 font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !email || success}
                                    className="flex items-center gap-2 px-8 py-3 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Invite"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
