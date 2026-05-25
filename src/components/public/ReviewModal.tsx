'use client';

import { useState } from 'react';
import { X, Star, Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ROLES = [
    'Player',
    'Team Captain',
    'Host',
    'Facility Manager',
    'Referee',
    'Spectator'
];

export function ReviewModal({ isOpen, onClose, onSuccess }: ReviewModalProps) {
    const [rating, setRating] = useState(5);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState(ROLES[0]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Format: First Name + Last Initial (e.g. Bill T.)
        const formattedName = `${firstName.trim()} ${lastName.trim().charAt(0).toUpperCase()}.`;

        const { data: { user } } = await supabase.auth.getSession().then((res: unknown) => { const r = res as { data: { session: { user: { id: string } } | null } }; return { data: { user: r.data.session?.user } }; });

        const { error: submitError } = await supabase
            .from('platform_reviews')
            .insert({
                user_id: user?.id || null,
                author_name: formattedName,
                text: text,
                role: role,
                rating: rating,
                is_approved: false 
            });

        if (submitError) {
            setError(submitError.message);
            setLoading(false);
        } else {
            setLoading(false);
            onSuccess();
            onClose();
            // Reset form
            setFirstName('');
            setLastName('');
            setText('');
            setRating(5);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            {/* Backdrop Click */}
            <div 
                className="absolute inset-0"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-pitch-black border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header Accent Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pitch-accent to-blue-500 z-20" />
                
                {/* Header */}
                <div className="bg-pitch-card p-6 flex items-start justify-between border-b border-white/5 relative overflow-hidden">
                    <div>
                        <h2 className="text-2xl font-heading font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-pitch-accent" />
                            Leave a <span className="text-pitch-accent">Review</span>
                        </h2>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
                            Help us build the elite infrastructure for grassroots sports.
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Rating Selection */}
                        <div className="bg-black/40 border border-white/5 rounded-lg p-5 text-center">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Overall Experience</label>
                            <div className="flex justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="transition-all transform active:scale-90 hover:scale-110"
                                    >
                                        <Star 
                                            className={cn(
                                                "w-10 h-10 transition-all",
                                                star <= rating ? "fill-pitch-accent text-pitch-accent drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]" : "text-white/10"
                                            )} 
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">First Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="e.g. Bill"
                                    className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-pitch-accent transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Last Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="e.g. Tate"
                                    className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-pitch-accent transition-colors"
                                />
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Your Role *</label>
                            <div className="relative">
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-pitch-accent transition-colors appearance-none cursor-pointer"
                                >
                                    {ROLES.map((r: string) => (
                                        <option key={r} value={r} className="bg-pitch-black">{r}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                                    ▼
                                </div>
                            </div>
                        </div>

                        {/* Review Text */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Feedback *</label>
                            <textarea
                                required
                                rows={4}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Tell the community about your experience..."
                                className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-pitch-accent transition-colors resize-none"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-widest text-sm rounded transition-all transform active:scale-95 hover:bg-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(204,255,0,0.2)]"
                        >
                            {loading ? 'Submitting...' : 'Post for Review'} <Send className="w-4 h-4" />
                        </button>
                        
                        <p className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] text-center mt-6">
                            Verified Submission • Pending Admin Approval
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
