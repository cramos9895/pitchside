
import { createClient } from '@/lib/supabase/server';
import { GameCard } from '@/components/GameCard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const revalidate = 0;

export default async function GamesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching games:', error);
    }

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans p-6 pt-32">
            <div className="max-w-7xl mx-auto">
                <Link href="/" className="flex items-center text-pitch-secondary hover:text-white mb-8 transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </Link>

                <h1 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter mb-12">
                    All Upcoming <span className="text-pitch-accent">Matches</span>
                </h1>

                {!games || games.length === 0 ? (
                    <div className="text-center py-20 border border-white/5 rounded-sm bg-pitch-card">
                        <p className="text-xl text-pitch-secondary font-bold">No games scheduled yet.</p>
                        <p className="text-sm text-gray-500 mt-2">Check back soon for upcoming matches.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {games.map((game: any) => (
                            <GameCard key={game.id} game={game} user={user} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
