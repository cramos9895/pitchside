import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MatchReviewCard } from '@/components/admin/MatchReviewCard';
import { ShieldAlert } from 'lucide-react';

export default async function AdminReviewsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');



    // Fetch pending_review matches
    const { data: matches, error } = await supabase
        .from('matches')
        .select(`
            *,
            home_team_rel:teams!home_team_id(name),
            away_team_rel:teams!away_team_id(name),
            games(title, base_pay, payment_method),
            match_reports(*),
            match_events(*)
        `)
        .eq('review_status', 'pending_review')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error("Failed to fetch pending reviews", error);
    }

    const pendingMatches = matches || [];

    return (
        <div className="min-h-screen bg-pitch-black text-white p-6 font-sans">
            <header className="mb-8 border-b border-white/10 pb-6">
                <h1 className="text-4xl font-black uppercase italic tracking-widest flex items-center gap-3 text-[#cbff00]">
                    <ShieldAlert className="w-10 h-10" /> Master Review Queue
                </h1>
                <p className="text-gray-400 mt-2 font-bold uppercase tracking-wider text-sm">
                    {pendingMatches.length} matches await financial approval and public locking.
                </p>
            </header>

            <main className="space-y-8 max-w-4xl mx-auto">
                {pendingMatches.length === 0 ? (
                    <div className="bg-pitch-card p-12 text-center rounded-sm border border-white/5">
                        <div className="text-gray-500 font-black italic uppercase text-2xl tracking-widest">No Pending Reviews</div>
                        <p className="text-gray-600 mt-2 font-bold">All matches have been locked and paid.</p>
                    </div>
                ) : (
                    pendingMatches.map(match => (
                        <MatchReviewCard key={match.id} match={match} />
                    ))
                )}
            </main>
        </div>
    );
}
