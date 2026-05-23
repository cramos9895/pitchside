'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, Trash2, Star, MessageSquare, Clock, User, BarChart3, TrendingUp, Filter, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface PlatformReview {
    id: string;
    author_name: string;
    text: string;
    role: string;
    rating: number;
    is_approved: boolean;
    created_at: string;
}

type SortOption = 'newest' | 'oldest' | 'rating-high' | 'rating-low';
type FilterRating = 'all' | 5 | 4 | 3 | 2 | 1;

export function ReviewModeration() {
    const [reviews, setReviews] = useState<PlatformReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [filterRating, setFilterRating] = useState<FilterRating>('all');
    
    const supabase = createClient();
    const toast = useToast();

    const fetchReviews = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('platform_reviews')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reviews:', error);
            toast.error('Failed to load reviews.');
        } else {
            setReviews(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleApprove = async (id: string) => {
        setActionId(id);
        const { error } = await supabase
            .from('platform_reviews')
            .update({ is_approved: true })
            .eq('id', id);

        if (error) {
            toast.error('Failed to approve review.');
        } else {
            setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: true } : r));
            toast.success('Review approved and live on homepage!');
        }
        setActionId(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this review? This cannot be undone.')) return;
        
        setActionId(id);
        const { error } = await supabase
            .from('platform_reviews')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Failed to delete review.');
        } else {
            setReviews(prev => prev.filter(r => r.id !== id));
            toast.success('Review deleted.');
        }
        setActionId(null);
    };

    const getFilteredAndSortedReviews = () => {
        let result = [...reviews];

        // Filtering
        if (filterRating !== 'all') {
            result = result.filter(r => r.rating === filterRating);
        }

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortBy === 'rating-high') return b.rating - a.rating;
            if (sortBy === 'rating-low') return a.rating - b.rating;
            return 0;
        });

        return result;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-pitch-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-pitch-secondary font-black uppercase tracking-widest text-xs">Loading Submissions...</p>
            </div>
        );
    }

    const totalReviews = reviews.length;
    const approvedCount = reviews.filter(r => r.is_approved).length;
    const pendingCount = totalReviews - approvedCount;
    
    const averageRating = totalReviews > 0 
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
        : "0.0";

    const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
        stars,
        count: reviews.filter(r => r.rating === stars).length,
        percentage: totalReviews > 0 ? (reviews.filter(r => r.rating === stars).length / totalReviews) * 100 : 0
    }));

    const displayReviews = getFilteredAndSortedReviews();

    return (
        <div className="space-y-10">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card */}
                <div className="bg-pitch-card border border-white/5 p-8 rounded-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Platform Score</p>
                        <div className="flex items-end gap-3">
                            <span className="text-6xl font-heading font-black italic uppercase text-white leading-none">{averageRating}</span>
                            <div className="pb-1 space-y-1">
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={cn("w-3 h-3", i < Math.round(Number(averageRating)) ? "fill-pitch-accent text-pitch-accent" : "text-white/10")} />
                                    ))}
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-pitch-accent">Community Consensus</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Reviews Card */}
                <div className="bg-pitch-card border border-white/5 p-8 rounded-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Total Submissions</p>
                        <div className="flex items-end gap-3">
                            <span className="text-6xl font-heading font-black italic uppercase text-white leading-none">{totalReviews}</span>
                            <div className="pb-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                    <span className="text-pitch-accent">{approvedCount}</span> Published
                                </p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                    <span className="text-red-500">{pendingCount}</span> Pending
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Distribution Card */}
                <div className="bg-pitch-card border border-white/5 p-8 rounded-sm flex flex-col justify-center">
                    <div className="space-y-3">
                        {ratingDistribution.map((item) => (
                            <div key={item.stars} className="flex items-center gap-4">
                                <div className="flex items-center gap-1 w-10 shrink-0">
                                    <span className="text-[10px] font-black text-white/60">{item.stars}</span>
                                    <Star className="w-2.5 h-2.5 fill-pitch-accent text-pitch-accent" />
                                </div>
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-pitch-accent transition-all duration-500 ease-out" 
                                        style={{ width: `${item.percentage}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-black text-white/40 w-8 text-right">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
                <h3 className="text-xl font-heading font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-pitch-accent" />
                    Testimonial <span className="text-pitch-accent">Inbox</span>
                </h3>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Filter */}
                    <div className="flex items-center gap-2 bg-pitch-card border border-white/5 p-1 rounded-sm">
                        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Filter className="w-3 h-3" /> Filter:
                        </div>
                        <div className="flex gap-1 pr-1">
                            {['all', 5, 4, 3, 2, 1].map((rating) => (
                                <button
                                    key={rating}
                                    onClick={() => setFilterRating(rating as FilterRating)}
                                    className={cn(
                                        "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
                                        filterRating === rating 
                                            ? "bg-pitch-accent text-pitch-black shadow-[0_0_10px_rgba(204,255,0,0.2)]" 
                                            : "text-white/40 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {rating === 'all' ? 'All' : `${rating}★`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2 bg-pitch-card border border-white/5 p-1 rounded-sm">
                        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <ArrowUpDown className="w-3 h-3" /> Sort:
                        </div>
                        <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest text-white outline-none pr-4 cursor-pointer"
                        >
                            <option value="newest" className="bg-pitch-black">Newest First</option>
                            <option value="oldest" className="bg-pitch-black">Oldest First</option>
                            <option value="rating-high" className="bg-pitch-black">Highest Rated</option>
                            <option value="rating-low" className="bg-pitch-black">Lowest Rated</option>
                        </select>
                    </div>
                </div>
            </div>

            {displayReviews.length === 0 ? (
                <div className="text-center py-20 border border-white/5 rounded-sm bg-pitch-card">
                    <Clock className="w-8 h-8 text-white/10 mx-auto mb-4" />
                    <p className="text-pitch-secondary font-bold">
                        {filterRating !== 'all' ? `No ${filterRating}-star reviews found.` : 'No reviews submitted yet.'}
                    </p>
                    <p className="text-xs text-white/20 mt-2 uppercase tracking-widest font-black">Waiting for community heat.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {displayReviews.map((review) => (
                        <div 
                            key={review.id} 
                            className={cn(
                                "group relative bg-pitch-card border rounded-sm p-6 transition-all duration-300",
                                review.is_approved ? "border-white/5 opacity-60" : "border-pitch-accent/30 shadow-[0_0_20px_rgba(204,255,0,0.05)]"
                            )}
                        >
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex-1 space-y-4">
                                    {/* Star Rating */}
                                    <div className="flex gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star 
                                                key={i} 
                                                className={cn(
                                                    "w-3 h-3",
                                                    i < review.rating ? "fill-pitch-accent text-pitch-accent" : "text-white/10"
                                                )} 
                                            />
                                        ))}
                                    </div>

                                    {/* Content */}
                                    <p className="text-white text-lg font-medium leading-relaxed italic">
                                        "{review.text}"
                                    </p>

                                    {/* Meta */}
                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                                        <div className="flex items-center gap-1.5 text-white">
                                            <User className="w-3 h-3 text-pitch-accent" />
                                            {review.author_name}
                                        </div>
                                        <div className="text-white/40 border-l border-white/10 pl-4">
                                            {review.role}
                                        </div>
                                        <div className="text-white/20 border-l border-white/10 pl-4">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex md:flex-col gap-2 shrink-0">
                                    {!review.is_approved ? (
                                        <button
                                            onClick={() => handleApprove(review.id)}
                                            disabled={actionId === review.id}
                                            className="flex-1 md:w-32 py-2.5 bg-pitch-accent text-pitch-black font-black uppercase tracking-widest text-[10px] rounded-sm hover:bg-white transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                                        >
                                            <Check className="w-3 h-3" /> Approve
                                        </button>
                                    ) : (
                                        <div className="md:w-32 py-2.5 bg-white/5 text-white/40 font-black uppercase tracking-widest text-[10px] rounded-sm border border-white/5 flex items-center justify-center gap-2">
                                            <Check className="w-3 h-3 text-pitch-accent" /> Published
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleDelete(review.id)}
                                        disabled={actionId === review.id}
                                        className="flex-1 md:w-32 py-2.5 bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-[10px] rounded-sm border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                </div>
                            </div>

                            {/* Pending Badge */}
                            {!review.is_approved && (
                                <div className="absolute -top-2 -left-2 bg-pitch-accent text-pitch-black text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-sm shadow-lg">
                                    Pending Approval
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
