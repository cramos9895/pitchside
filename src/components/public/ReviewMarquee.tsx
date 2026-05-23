'use client';

import { Star, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ReviewModal } from './ReviewModal';
import { useToast } from '@/components/ui/Toast';

interface Review {
    id: string;
    text: string;
    author_name: string;
    role: string;
    rating: number;
}

export function ReviewMarquee() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { success } = useToast();
    const supabase = createClient();

    useEffect(() => {
        async function fetchReviews() {
            const { data, error } = await supabase
                .from('platform_reviews')
                .select('*')
                .eq('is_approved', true)
                .order('created_at', { ascending: false });

            if (data) {
                setReviews(data);
            }
            setLoading(false);
        }
        fetchReviews();
    }, []);

    const handleSuccess = () => {
        success("Review submitted! It will appear once approved by an admin.");
    };

    if (loading) return null;
    if (reviews.length === 0 && !loading) return (
        <section className="pt-8 pb-8 bg-black text-center border-t border-white/5">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-6">
                Be the first to leave a <span className="text-pitch-accent">Review</span>
            </h2>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-bold uppercase tracking-wider text-black bg-pitch-accent px-8 py-4 rounded-sm hover:bg-white transition-colors"
            >
                Leave a Review
            </button>
            <ReviewModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={handleSuccess}
            />
        </section>
    );

    return (
        <section className="pt-8 pb-4 bg-pitch-black overflow-hidden relative">
            <div className="max-w-7xl mx-auto px-6 mb-12 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic text-white tracking-tight">
                        Word on the <span className="text-pitch-accent">Pitch</span>
                    </h2>
                    <p className="text-white/50 text-sm font-medium tracking-wide uppercase mt-2">
                        Don't just take our word for it.
                    </p>
                </div>
                {/* Button to trigger the review submission modal */}
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="hidden md:flex text-xs font-bold uppercase tracking-wider text-black bg-pitch-accent px-4 py-2 rounded-sm hover:bg-white transition-colors"
                >
                    Leave a Review
                </button>
            </div>

            <div className="relative group">
                {/* Gradient Traps to fade the edges - now scoped to the filmstrip only */}
                <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-20 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-20 pointer-events-none" />

                {/* The Horizontal Snap Scroll Container */}
                <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-6 px-6 md:px-12 pb-8 relative z-10">
                    {reviews.map((review) => (
                        <div 
                            key={review.id} 
                            className="snap-center shrink-0 w-[85vw] md:w-[400px] bg-white/5 border border-white/10 p-8 rounded-sm hover:border-white/20 transition-colors flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex gap-1 mb-6">
                                    {[...Array(review.rating)].map((_, i) => (
                                        <Star key={i} className="w-4 h-4 fill-pitch-accent text-pitch-accent" />
                                    ))}
                                </div>
                                <p className="text-lg text-white font-medium leading-relaxed italic">
                                    "{review.text}"
                                </p>
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                                <p className="text-sm font-black uppercase tracking-widest text-pitch-accent">
                                    {review.author_name}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                                    {review.role}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile Submit Button */}
            <div className="mt-8 px-6 md:hidden">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full text-xs font-bold uppercase tracking-wider text-black bg-pitch-accent px-4 py-4 rounded-sm"
                >
                    Leave a Review
                </button>
            </div>

            {/* Modal */}
            <ReviewModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={handleSuccess}
            />

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </section>
    );
}
