import { ReviewModeration } from '@/components/admin/ReviewModeration';
import { MessageSquare } from 'lucide-react';

export default function AdminReviewsPage() {
    return (
        <div className="animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-12 border-b border-white/10 pb-6">
                <div className="inline-block px-3 py-1 bg-pitch-accent/10 text-pitch-accent text-xs font-bold uppercase tracking-widest rounded mb-2">
                    Community Feedback
                </div>
                <h1 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter flex items-center gap-4">
                    <span className="text-pitch-accent"><MessageSquare className="w-8 h-8" /></span>
                    Review <span className="text-pitch-accent">Moderation</span>
                </h1>
                <p className="text-pitch-secondary mt-2">
                    Approve or delete testimonials before they go live on the homepage.
                </p>
            </div>

            <ReviewModeration />
        </div>
    );
}
